import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
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
  } catch (error: any) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}


export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    if (!farm_id) throw new Error('Unauthorized'); // Strict: Only farm owners can create

    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier, item_name, min_threshold, unit_price } = body;

    const dbName = item_name || name;
    const dbThreshold = min_threshold || threshold;
    const dbPrice = unit_price || price;

    const query = `
      INSERT INTO inventory (farm_id, item_name, category, quantity, unit, min_threshold, unit_price, status, supplier, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, 'In Stock', $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [farm_id, dbName, category, quantity, unit, dbThreshold, dbPrice, supplier];
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Add inventory error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const body = await request.json();
    const { id, name, category, quantity, unit, threshold, price, supplier, item_name, min_threshold, unit_price } = body;

    const dbName = item_name || name;
    const dbThreshold = min_threshold || threshold;
    const dbPrice = unit_price || price;
    
    let whereClause = "WHERE id = $8";
    let values = [dbName, category, quantity, unit, dbThreshold, dbPrice, supplier, id];

    if (!is_superadmin) {
        if (!farm_id) throw new Error('Unauthorized');
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

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const query = is_superadmin
        ? 'DELETE FROM inventory WHERE id = $1'
        : 'DELETE FROM inventory WHERE id = $1 AND farm_id = $2';
    
    const params = is_superadmin ? [id] : [id, farm_id];
    
    const result = await client.query(query, params);
    
    if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
