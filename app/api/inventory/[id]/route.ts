import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

// DELETE ITEM
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const params = await props.params; // Await the params
    const id = params.id;
    
    await client.query('DELETE FROM inventory WHERE id = $1', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
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
      WHERE id = $8
      RETURNING *
    `;

    const values = [name, category, quantity, unit, threshold, price, supplier, id];
    
    const result = await client.query(query, values);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  } finally {
    client.release();
  }
}
