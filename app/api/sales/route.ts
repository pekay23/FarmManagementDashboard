import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { ApiError, apiErrorResponse, getSessionInfo, idValue, logAudit, numberValue, readJson, requirePermission, text } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  // ✅ OPTIMIZED
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    const whereClause = is_superadmin ? "" : "WHERE s.farm_id = $1";
    const params = is_superadmin ? [] : [farm_id];

    const query = `
      SELECT 
        s.id, 
        s.buyer_name as customer,
        s.contact_info, 
        s.total_amount as amount,
        s.sale_date as date,
        s.sale_date as created_at,
        s.status,
        json_agg(
          json_build_object(
            'name', si.item_name, 
            'qty', si.quantity, 
            'price', si.price_at_sale
          )
        ) as "itemsData"
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to fetch sales');
  }
}

function normalizeSaleItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('At least one sale item is required', 400);
  }

  return items.map((item, index) => {
    const row = item as Record<string, unknown>;
    const name = text(row.item_name ?? row.name, `items[${index}].name`, { max: 160 });
    const qty = numberValue(row.quantity ?? row.qty, `items[${index}].quantity`, { min: 0.0001 });
    const price = numberValue(row.price_at_sale ?? row.price, `items[${index}].price`, { min: 0 });
    return { name, qty, price };
  });
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('sales:write');
    if (!session.farm_id) throw new ApiError('Farm workspace required', 403);
    const { farm_id } = session;

    const body = await readJson(request);
    const buyerName = text(body.buyer_name ?? body.customer, 'buyer_name', { max: 160 });
    const contactInfo = text(body.contact_info, 'contact_info', { required: false, max: 120 });
    const items = normalizeSaleItems(body.items ?? body.itemsData);
    const deductInventory = Boolean(body.deduct_inventory);
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.price, 0);

    await client.query('BEGIN');

    // 1. Insert Sale
    const saleQuery = `
      INSERT INTO sales (farm_id, buyer_name, contact_info, total_amount, status, sale_date)
      VALUES ($1, $2, $3, $4, 'Completed', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const saleResult = await client.query(saleQuery, [farm_id, buyerName, contactInfo, totalAmount]);
    const newSale = saleResult.rows[0];

    // 2. Insert Items
    for (const item of items) {
      await client.query(
        'INSERT INTO sale_items (farm_id, sale_id, item_name, quantity, price_at_sale) VALUES ($1, $2, $3, $4, $5)', 
        [farm_id, newSale.id, item.name, item.qty, item.price]
      );

      if (deductInventory) {
        const inventoryUpdate = await client.query(
          `UPDATE inventory
           SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
           WHERE item_name = $2 AND farm_id = $3 AND quantity >= $1
           RETURNING id`,
          [item.qty, item.name, farm_id]
        );
        if (inventoryUpdate.rowCount === 0) {
          throw new ApiError(`Insufficient stock for ${item.name}`, 409);
        }
      }
    }

    await client.query('COMMIT');
    await logAudit(session, 'sale.created', 'sale', newSale.id, { buyer_name: buyerName, total_amount: totalAmount });

    return NextResponse.json({
        id: newSale.id,
        customer: newSale.buyer_name,
        contact_info: newSale.contact_info,
        amount: newSale.total_amount,
        date: newSale.sale_date,
        itemsData: items,
        created_at: newSale.sale_date 
    });

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return apiErrorResponse(error, 'Failed to record sale');
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('sales:write');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const id = idValue(body.id);

    await client.query('BEGIN');
    
    // ✅ Logic: Super Admin can delete ANY sale. Client restricted by farm_id.
    let checkQuery = 'SELECT id FROM sales WHERE id = $1';
    const checkParams: Array<string | number> = [id];

    if (!is_superadmin) {
        if (!farm_id) throw new Error('Unauthorized');
        checkQuery += ' AND farm_id = $2';
        checkParams.push(farm_id);
    }

    const check = await client.query(checkQuery, checkParams);
    if (check.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Sale not found or access denied' }, { status: 404 });
    }

    // Delete items first
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    
    // Delete the sale record
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    await logAudit(session, 'sale.deleted', 'sale', id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return apiErrorResponse(error, 'Failed to delete sale');
  } finally {
    client.release();
  }
}
