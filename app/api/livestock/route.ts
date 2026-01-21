import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM livestock ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Fetch livestock error:", error);
    return NextResponse.json([], { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;

    const query = `
      INSERT INTO livestock (animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      animal_id, 
      species, 
      breed, 
      sex, 
      date_of_birth, 
      current_weight_kg, 
      health_status || 'Healthy'
    ];

    const result = await client.query(query, values);
    
    // Return the single created object
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Insert livestock error:", error);
    return NextResponse.json({ error: 'Failed to add animal' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;

    const query = `
      UPDATE livestock
      SET animal_id = $1,
          species = $2,
          breed = $3,
          sex = $4,
          date_of_birth = $5,
          current_weight_kg = $6,
          health_status = $7
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      animal_id, 
      species, 
      breed, 
      sex, 
      date_of_birth, 
      current_weight_kg, 
      health_status, 
      id
    ];

    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Update livestock error:", error);
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 });
  } finally {
    client.release();
  }
}
