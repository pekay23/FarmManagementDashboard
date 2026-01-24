import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to get the secure Farm ID
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
      'SELECT * FROM livestock WHERE farm_id = $1 ORDER BY created_at DESC', 
      [farm_id]
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Fetch livestock error:", error);
    return NextResponse.json([], { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;

    const query = `
      INSERT INTO livestock (farm_id, animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      farm_id, // 🔒 Bind to farm
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
  } catch (error: any) {
    console.error("Insert livestock error:", error);
    return NextResponse.json({ error: 'Failed to add animal' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
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
      WHERE id = $8 AND farm_id = $9
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
      id,
      farm_id // 🔒 Ensure we only update our own records
    ];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
    }

    const updatedAnimal = result.rows[0];
    
    // Manual date conversion for safety
    const serializableAnimal = {
      ...updatedAnimal,
      date_of_birth: updatedAnimal.date_of_birth ? new Date(updatedAnimal.date_of_birth).toISOString() : null,
      created_at: updatedAnimal.created_at ? new Date(updatedAnimal.created_at).toISOString() : null,
      updated_at: updatedAnimal.updated_at ? new Date(updatedAnimal.updated_at).toISOString() : null,
    };

    return NextResponse.json(serializableAnimal);
  } catch (error: any) {
    console.error("Update livestock error:", error);
    return NextResponse.json({ error: 'Failed to update animal' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const farm_id = await getFarmId(); // 🔒 Secure check
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Only delete if the ID belongs to the current farm
        const result = await client.query('DELETE FROM livestock WHERE id = $1 AND farm_id = $2', [id, farm_id]);
        
        if (result.rowCount === 0) {
             return NextResponse.json({ error: 'Animal not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete livestock error:', error);
        return NextResponse.json({ error: 'Failed to delete livestock' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
    } finally {
        client.release();
    }
}
