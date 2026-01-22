import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Server DB connection

export const dynamic = 'force-dynamic'; // Ensure fresh data

// GET treatments
// If ?crop_id=ALL or no crop_id is provided, return ALL treatments (for Sync)
// If ?crop_id=UUID is provided, return treatments for that specific crop
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crop_id = searchParams.get('crop_id');

  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM crop_treatments ORDER BY treatment_date DESC';
    let values: any[] = [];

    // Only filter if crop_id is provided AND it's not "ALL"
    if (crop_id && crop_id !== 'ALL') {
        query = 'SELECT * FROM crop_treatments WHERE crop_id = $1 ORDER BY treatment_date DESC';
        values = [crop_id];
    }

    const result = await client.query(query, values);
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
