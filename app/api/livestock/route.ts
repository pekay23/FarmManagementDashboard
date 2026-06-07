import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit, requirePermission } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
  };
}

export async function GET() {
  // ✅ FIX: Do not use pool.connect(). Use pool.query() directly.
  // This automatically handles connection checkout and release.
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    let query = 'SELECT * FROM livestock';
    const values: any[] = [];
    
    if (!is_superadmin) {
        query += ' WHERE farm_id = $1';
        values.push(farm_id);
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch livestock error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}

// POST, PUT, DELETE usually need transactions (BEGIN/COMMIT), so they MUST keep using pool.connect().
// But GET requests are safe to simplify.

export async function POST(request: Request) {
  const client = await pool.connect(); // Keep client for transaction
  try {
    const session = await requirePermission('livestock:write');
    const { farm_id } = session;
    if (!farm_id) throw new Error('Unauthorized'); 

    const body = await request.json();
    const { animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;
    
    const query = `
      INSERT INTO livestock (farm_id, animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      farm_id, animal_id, species, breed, sex, 
      date_of_birth, current_weight_kg, health_status || 'Healthy'
    ];
    const result = await client.query(query, values);
    await logAudit(session, 'livestock.created', 'livestock', result.rows[0].id, { animal_id, species });
    
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add animal' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('livestock:write');
    const { farm_id, is_superadmin } = session;
    const body = await request.json();
    const { id, animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;

    let whereClause = "WHERE id = $8";
    const values = [
        animal_id, species, breed, sex, date_of_birth, 
        current_weight_kg, health_status, id
    ];

    if (!is_superadmin) {
        if (!farm_id) throw new Error('Unauthorized');
        whereClause += ' AND farm_id = $9';
        values.push(farm_id);
    }
    
    const query = `
      UPDATE livestock
      SET animal_id = $1, species = $2, breed = $3, sex = $4,
          date_of_birth = $5, current_weight_kg = $6, health_status = $7,
          updated_at = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
    }

    // Manual date conversion
    const updatedAnimal = result.rows[0];
    const serializableAnimal = {
      ...updatedAnimal,
      date_of_birth: updatedAnimal.date_of_birth ? new Date(updatedAnimal.date_of_birth).toISOString() : null,
      created_at: updatedAnimal.created_at ? new Date(updatedAnimal.created_at).toISOString() : null,
      updated_at: updatedAnimal.updated_at ? new Date(updatedAnimal.updated_at).toISOString() : null,
    };

    await logAudit(session, 'livestock.updated', 'livestock', id, { animal_id, species, health_status });
    return NextResponse.json(serializableAnimal);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update animal' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const session = await requirePermission('livestock:write');
        const { farm_id, is_superadmin } = session;
        const { id } = await request.json();
        
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        let query = 'DELETE FROM livestock WHERE id = $1';
        const values = [id];

        if (!is_superadmin) {
            if (!farm_id) throw new Error('Unauthorized');
            query += ' AND farm_id = $2';
            values.push(farm_id);
        }

        const result = await client.query(query, values);
        
        if (result.rowCount === 0) {
             return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
        }

        await logAudit(session, 'livestock.deleted', 'livestock', id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to delete livestock' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
    } finally {
        client.release();
    }
}
