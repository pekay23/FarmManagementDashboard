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
          health_status = $7,
          updated_at = CURRENT_TIMESTAMP
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

    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
    }

    const updatedAnimal = result.rows[0];

    // ✅ FIX: Manually convert Date objects to strings to prevent serialization errors.
    const serializableAnimal = {
      ...updatedAnimal,
      date_of_birth: updatedAnimal.date_of_birth ? new Date(updatedAnimal.date_of_birth).toISOString() : null,
      created_at: updatedAnimal.created_at ? new Date(updatedAnimal.created_at).toISOString() : null,
      updated_at: updatedAnimal.updated_at ? new Date(updatedAnimal.updated_at).toISOString() : null,
    };

    return NextResponse.json(serializableAnimal);

  } catch (error) {
    console.error("Update livestock error:", error);
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ✅ THIS IS THE CORRECTED DELETE FUNCTION
export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // The query now only deletes from the 'livestock' table, which exists.
        await client.query('DELETE FROM livestock WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete livestock error:', error);
        return NextResponse.json({ error: 'Failed to delete livestock' }, { status: 500 });
    } finally {
        client.release();
    }
}
