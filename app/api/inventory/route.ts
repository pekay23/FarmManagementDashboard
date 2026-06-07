import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { ApiError, apiErrorResponse, getSessionInfo, idValue, logAudit, numberValue, readJson, requirePermission, text } from '@/lib/api';

export const dynamic = 'force-dynamic';

function normalizeInventoryPayload(body: Record<string, unknown>) {
  return {
    name: text(body.item_name ?? body.name, 'item_name', { max: 160 }),
    category: text(body.category, 'category', { max: 80 }),
    quantity: numberValue(body.quantity, 'quantity', { min: 0 }),
    unit: text(body.unit, 'unit', { max: 30 }),
    threshold: numberValue(body.min_threshold ?? body.threshold, 'min_threshold', { min: 0 }),
    price: numberValue(body.unit_price ?? body.price, 'unit_price', { min: 0 }),
    supplier: text(body.supplier, 'supplier', { required: false, max: 160 }),
  };
}

export async function GET() {
  // ✅ OPTIMIZED
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    const query = is_superadmin
        ? 'SELECT * FROM inventory ORDER BY last_updated DESC'
        : 'SELECT * FROM inventory WHERE farm_id = $1 ORDER BY last_updated DESC';
    
    const params = is_superadmin ? [] : [farm_id];

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to fetch inventory');
  }
}


export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('inventory:write');
    if (!session.farm_id) throw new ApiError('Farm workspace required', 403);
    const { farm_id } = session;
    const body = await readJson(request);
    const item = normalizeInventoryPayload(body);

    const query = `
      INSERT INTO inventory (farm_id, item_name, category, quantity, unit, min_threshold, unit_price, status, supplier, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, 'In Stock', $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [farm_id, item.name, item.category, item.quantity, item.unit, item.threshold, item.price, item.supplier];
    const result = await client.query(query, values);
    await logAudit(session, 'inventory.created', 'inventory', result.rows[0].id, { item_name: item.name, quantity: item.quantity });
    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to add item');
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('inventory:write');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const id = idValue(body.id);
    const item = normalizeInventoryPayload(body);
    
    let whereClause = "WHERE id = $8";
    const values = [item.name, item.category, item.quantity, item.unit, item.threshold, item.price, item.supplier, id];

    if (!is_superadmin) {
        if (!farm_id) throw new ApiError('Unauthorized', 401);
        whereClause += ' AND farm_id = $9';
        values.push(farm_id);
    }
    
    const query = `
      UPDATE inventory 
      SET item_name = $1, category = $2, quantity = $3, unit = $4, 
          min_threshold = $5, unit_price = $6, supplier = $7, last_updated = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    await logAudit(session, 'inventory.updated', 'inventory', id, { item_name: item.name, quantity: item.quantity });
    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to update item');
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('inventory:write');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const id = idValue(body.id);

    const query = is_superadmin
        ? 'DELETE FROM inventory WHERE id = $1'
        : 'DELETE FROM inventory WHERE id = $1 AND farm_id = $2';
    
    const params = is_superadmin ? [id] : [id, farm_id];
    
    const result = await client.query(query, params);
    
    if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }
    
    await logAudit(session, 'inventory.deleted', 'inventory', id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to delete item');
  } finally {
    client.release();
  }
}
