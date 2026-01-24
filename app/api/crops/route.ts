import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ✅ Helper to check Session & Role
async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
  };
}

export async function GET() {
  // ✅ OPTIMIZED
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    let query = 'SELECT * FROM crops';
    let values: any[] = [];

    if (!is_superadmin) {
        query += ' WHERE farm_id = $1';
        values.push(farm_id);
    }
    
    query += ' ORDER BY planting_date DESC';

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}


// POST: Strict Farm Owner Only (Super Admin doesn't create farm data directly)
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    if (!farm_id) throw new Error('Unauthorized'); // Block Super Admin for now

    const body = await request.json();
    const { 
      plot_number, crop_type, variety, planting_date, 
      expected_harvest_date, plot_size_acres, location, estimated_yield_kg,
      status
    } = body;

    const query = `
      INSERT INTO crops (
        farm_id, plot_number, crop_type, variety, planting_date, 
        expected_harvest_date, plot_size_acres, location, 
        estimated_yield_kg, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `;
    const values = [
      farm_id, 
      plot_number, crop_type, variety, planting_date, 
      expected_harvest_date, plot_size_acres, location, estimated_yield_kg, 
      status || 'Growing'
    ];
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

// PUT: Farm Owner + Super Admin (if needed, but usually kept strict)
export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const body = await request.json();
    const { 
      id, plot_number, crop_type, variety, planting_date, expected_harvest_date, 
      plot_size_acres, location, estimated_yield_kg, status, 
      actual_yield_kg, harvest_notes 
    } = body;

    // ✅ Logic: Super Admin can update ANY crop by ID. Client restricted by farm_id.
    let whereClause = "WHERE id = $12";
    let values = [
      plot_number, crop_type, variety, planting_date, expected_harvest_date,
      plot_size_acres, location, estimated_yield_kg, actual_yield_kg, 
      harvest_notes, status, id
    ];

    if (!is_superadmin) {
        if (!farm_id) throw new Error('Unauthorized');
        whereClause += " AND farm_id = $13";
        values.push(farm_id);
    }

    const query = `
      UPDATE crops
      SET plot_number = $1, crop_type = $2, variety = $3, planting_date = $4,
          expected_harvest_date = $5, plot_size_acres = $6, location = $7,
          estimated_yield_kg = $8, actual_yield_kg = $9, harvest_notes = $10, status = $11
      ${whereClause}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Crop not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

// DELETE: Farm Owner + Super Admin
export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const { farm_id, is_superadmin } = await getSessionInfo();
        const { id } = await request.json();
        
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await client.query('BEGIN');
        
        // 1. Check Existence & Ownership
        let checkQuery = 'SELECT id FROM crops WHERE id = $1';
        let checkParams = [id];

        if (!is_superadmin) {
            if (!farm_id) throw new Error('Unauthorized');
            checkQuery += ' AND farm_id = $2';
            checkParams.push(farm_id);
        }

        const check = await client.query(checkQuery, checkParams);
        
        if (check.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Crop not found or access denied' }, { status: 404 });
        }

        // 2. Delete Treatments
        await client.query('DELETE FROM crop_treatments WHERE crop_id = $1', [id]);
        
        // 3. Delete Crop
        await client.query('DELETE FROM crops WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Delete crop error:', error);
        return NextResponse.json({ error: 'Failed to delete crop' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
    } finally {
        client.release();
    }
}
