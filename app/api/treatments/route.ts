import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crop_id = searchParams.get('crop_id');
  
  // ✅ FIX: Use pool.query() directly instead of pool.connect()
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    let query = '';
    let values: any[] = [];

    if (is_superadmin) {
        if (crop_id && crop_id !== 'ALL') {
            query = 'SELECT * FROM crop_treatments WHERE crop_id = $1 ORDER BY treatment_date DESC';
            values = [crop_id];
        } else {
            query = 'SELECT * FROM crop_treatments ORDER BY treatment_date DESC';
        }
    } else {
        if (!farm_id) throw new Error('Unauthorized');
        
        if (crop_id && crop_id !== 'ALL') {
            query = 'SELECT * FROM crop_treatments WHERE farm_id = $1 AND crop_id = $2 ORDER BY treatment_date DESC';
            values = [farm_id, crop_id];
        } else {
            query = 'SELECT * FROM crop_treatments WHERE farm_id = $1 ORDER BY treatment_date DESC';
            values = [farm_id];
        }
    }

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch treatments error:', error);
    return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}

// POST remains unchanged as it requires a transaction
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    if (!farm_id) throw new Error('Unauthorized'); 

    const body = await request.json();
    const { crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes } = body;

    const check = await client.query('SELECT id FROM crops WHERE id = $1 AND farm_id = $2', [crop_id, farm_id]);
    if (check.rowCount === 0) {
        return NextResponse.json({ error: 'Crop not found or access denied' }, { status: 404 });
    }

    const query = `
      INSERT INTO crop_treatments (farm_id, crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [farm_id, crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes];
    const result = await client.query(query, values);
    
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Save treatment error:', error);
    return NextResponse.json({ error: 'Failed to save treatment' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
