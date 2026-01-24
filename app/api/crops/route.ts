import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to get secure Farm ID
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
      'SELECT * FROM crops WHERE farm_id = $1 ORDER BY planting_date DESC', 
      [farm_id]
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
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
      farm_id, // 🔒 Bind to farm
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

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { 
      id, plot_number, crop_type, variety, planting_date, expected_harvest_date, 
      plot_size_acres, location, estimated_yield_kg, status, 
      actual_yield_kg, harvest_notes 
    } = body;

    const query = `
      UPDATE crops
      SET plot_number = $1,
          crop_type = $2,
          variety = $3,
          planting_date = $4,
          expected_harvest_date = $5,
          plot_size_acres = $6,
          location = $7,
          estimated_yield_kg = $8,
          actual_yield_kg = $9,
          harvest_notes = $10,
          status = $11
      WHERE id = $12 AND farm_id = $13 -- 🔒 Scope update
      RETURNING *
    `;
    const values = [
      plot_number, crop_type, variety, planting_date, expected_harvest_date,
      plot_size_acres, location, estimated_yield_kg, actual_yield_kg, 
      harvest_notes, status, id, farm_id
    ];
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

// ✅ DELETE HANDLER
export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const farm_id = await getFarmId(); // 🔒 Secure check
        const { id } = await request.json();
        
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await client.query('BEGIN');
        
        // Delete associated treatments first (Scoped to farm via crop ownership check implicitly, or explicit join)
        // Ideally we check ownership first, but standard DELETE WHERE id AND farm_id is safe enough.
        // However, since treatments rely on crop_id, we just need to ensure the CROP belongs to the farm.
        
        // 1. Verify Crop Ownership & Existence
        const checkQuery = 'SELECT id FROM crops WHERE id = $1 AND farm_id = $2';
        const check = await client.query(checkQuery, [id, farm_id]);
        
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
