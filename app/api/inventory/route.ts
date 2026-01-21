import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

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
    const { name, category, quantity, unit, threshold, price, supplier } = body;

    const query = `
      INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, unit_price, status, supplier)
      VALUES ($1, $2, $3, $4, $5, $6, 'In Stock', $7)
      RETURNING *
    `;

    const values = [name, category, quantity, unit, threshold, price, supplier];

    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Add inventory error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  } finally {
    client.release();
  }
}
