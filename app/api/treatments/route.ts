import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Server DB connection

// GET treatments for a specific crop (pass ?crop_id=XYZ)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crop_id = searchParams.get('crop_id');

  if (!crop_id) return NextResponse.json([], { status: 200 });

  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM crop_treatments WHERE crop_id = $1 ORDER BY treatment_date DESC';
    const result = await client.query(query, [crop_id]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch treatments error:', error);
    return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ADD a new treatment
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes } = body;

    const query = `
      INSERT INTO crop_treatments (crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes];

    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Save treatment error:', error);
    return NextResponse.json({ error: 'Failed to save treatment' }, { status: 500 });
  } finally {
    client.release();
  }
}
