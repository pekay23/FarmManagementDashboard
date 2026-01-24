import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to get secure Farm ID
async function getFarmId() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).farm_id) {
    throw new Error('Unauthorized');
  }
  return (session.user as any).farm_id;
}

export async function GET() {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check

    const result = await client.query(
      'SELECT * FROM inventory WHERE farm_id = $1 ORDER BY last_updated DESC', 
      [farm_id]
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier, item_name, min_threshold, unit_price } = body;

    // Handle mapping from camelCase (local) or snake_case (sync)
    const dbName = item_name || name;
    const dbThreshold = min_threshold || threshold;
    const dbPrice = unit_price || price;

    const query = `
      INSERT INTO inventory (farm_id, item_name, category, quantity, unit, min_threshold, unit_price, status, supplier, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'In Stock', $8, CURRENT_TIMESTAMP)
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

// ✅ PUT Handler for Updates (Scoped to Farm)
export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { id, name, category, quantity, unit, threshold, price, supplier, item_name, min_threshold, unit_price } = body;

    // Handle mapping
    const dbName = item_name || name;
    const dbThreshold = min_threshold || threshold;
    const dbPrice = unit_price || price;

    const query = `
      UPDATE inventory 
      SET item_name = $1, 
          category = $2, 
          quantity = $3, 
          unit = $4, 
          min_threshold = $5, 
          unit_price = $6, 
          supplier = $7,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $8 AND farm_id = $9 -- 🔒 Scoped Update
      RETURNING *
    `;

    const values = [dbName, category, quantity, unit, dbThreshold, dbPrice, supplier, id, farm_id];
    
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

// ✅ DELETE Handler (Scoped to Farm)
export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const result = await client.query('DELETE FROM inventory WHERE id = $1 AND farm_id = $2', [id, farm_id]);
    
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
