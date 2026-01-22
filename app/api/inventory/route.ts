import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM inventory ORDER BY last_updated DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier, item_name, min_threshold, unit_price } = body;

    // Handle mapping from camelCase (local) or snake_case (sync)
    const dbName = item_name || name;
    const dbThreshold = min_threshold || threshold;
    const dbPrice = unit_price || price;

    const query = `
      INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, unit_price, status, supplier, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, 'In Stock', $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [dbName, category, quantity, unit, dbThreshold, dbPrice, supplier];

    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Add inventory error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ✅ ADDED: PUT Handler for Updates
export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
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
      WHERE id = $8
      RETURNING *
    `;

    const values = [dbName, category, quantity, unit, dbThreshold, dbPrice, supplier, id];
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ✅ ADDED: DELETE Handler
export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await client.query('DELETE FROM inventory WHERE id = $1', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  } finally {
    client.release();
  }
}
