import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper to get secure Farm ID
async function getFarmId() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).farm_id) {
    throw new Error('Unauthorized');
  }
  return (session.user as any).farm_id;
}

// DELETE ITEM
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const params = await props.params;
    const id = params.id;
    
    // Only delete if it matches ID AND Farm ID
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

// UPDATE ITEM
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const params = await props.params;
    const id = params.id;
    
    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier } = body;

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

    const values = [name, category, quantity, unit, threshold, price, supplier, id, farm_id];
    
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
