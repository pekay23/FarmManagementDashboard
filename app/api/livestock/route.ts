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
    
    // ✅ FIX: "UPSERT" logic to prevent duplicate key errors
    const query = `
      INSERT INTO livestock (animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (animal_id) DO UPDATE SET
        species = EXCLUDED.species,
        breed = EXCLUDED.breed,
        sex = EXCLUDED.sex,
        date_of_birth = EXCLUDED.date_of_birth,
        current_weight_kg = EXCLUDED.current_weight_kg,
        health_status = EXCLUDED.health_status,
        updated_at = CURRENT_TIMESTAMP
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
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Insert livestock error:", error);
    return NextResponse.json({ error: 'Failed to add animal' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
    // ... (Your existing PUT function is fine)
}

export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await client.query('BEGIN');
        
        // ✅ FIX: Removed the line that caused the crash, as "livestock_logs" does not exist.
        // We will only delete the main animal record.
        await client.query('DELETE FROM livestock WHERE id = $1', [id]);
        
        await client.query('COMMIT');

        return NextResponse.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete livestock error:', error);
        return NextResponse.json({ error: 'Failed to delete livestock' }, { status: 500 });
    } finally {
        client.release();
    }
}
