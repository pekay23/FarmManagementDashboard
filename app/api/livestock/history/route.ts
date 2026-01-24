import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getFarmId() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).farm_id) {
    throw new Error('Unauthorized');
  }
  return (session.user as any).farm_id;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type'); 

  if (!id || !type) return NextResponse.json([]);

  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    let query = '';
    
    // 🔒 All queries now check farm_id
    if (type === 'vaccines') {
      query = 'SELECT * FROM livestock_vaccinations WHERE livestock_id = $1 AND farm_id = $2 ORDER BY vaccination_date DESC';
    } else if (type === 'treatments') {
      query = 'SELECT * FROM livestock_treatments WHERE livestock_id = $1 AND farm_id = $2 ORDER BY treatment_date DESC';
    } else if (type === 'weights') {
      query = 'SELECT * FROM livestock_weight_logs WHERE livestock_id = $1 AND farm_id = $2 ORDER BY log_date DESC';
    } else {
        return NextResponse.json([]);
    }

    const result = await client.query(query, [id, farm_id]);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch records error:', error);
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
    const { type, livestock_id, ...data } = body;

    // 🔒 Verify ownership of the livestock first
    const check = await client.query('SELECT id FROM livestock WHERE id = $1 AND farm_id = $2', [livestock_id, farm_id]);
    if (check.rowCount === 0) {
        return NextResponse.json({ error: 'Livestock not found or access denied' }, { status: 404 });
    }

    if (type === 'vaccine') {
      const query = `
        INSERT INTO livestock_vaccinations (farm_id, livestock_id, vaccine_name, vaccination_date, veterinarian, batch_number) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      const values = [farm_id, livestock_id, data.name, data.date, data.vet, data.batch];
      await client.query(query, values);

    } else if (type === 'treatment') {
      const query = `
        INSERT INTO livestock_treatments (farm_id, livestock_id, condition, medication, treatment_date, dosage, duration, veterinarian, notes) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      const values = [farm_id, livestock_id, data.condition, data.medication, data.date, data.dosage, data.duration, data.vet, data.notes];
      await client.query(query, values);

    } else if (type === 'weight') {
      // 1. Log the weight history
      const logQuery = `
        INSERT INTO livestock_weight_logs (farm_id, livestock_id, weight_kg, log_date, notes) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(logQuery, [farm_id, livestock_id, data.weight, data.date, data.notes]);

      // 2. Update the main livestock record
      // 🔒 Scoped UPDATE
      const updateQuery = 'UPDATE livestock SET current_weight_kg = $1 WHERE id = $2 AND farm_id = $3';
      await client.query(updateQuery, [data.weight, livestock_id, farm_id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Add record error:', error);
    return NextResponse.json({ error: 'Failed to save record' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
