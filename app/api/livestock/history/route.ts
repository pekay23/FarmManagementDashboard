import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type'); 

  if (!id || !type) return NextResponse.json([]);

  const client = await pool.connect();
  try {
    let query = '';
    
    if (type === 'vaccines') {
      query = 'SELECT * FROM livestock_vaccinations WHERE livestock_id = $1 ORDER BY vaccination_date DESC';
    } else if (type === 'treatments') {
      query = 'SELECT * FROM livestock_treatments WHERE livestock_id = $1 ORDER BY treatment_date DESC';
    } else if (type === 'weights') {
      query = 'SELECT * FROM livestock_weight_logs WHERE livestock_id = $1 ORDER BY log_date DESC';
    } else {
        return NextResponse.json([]);
    }

    const result = await client.query(query, [id]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch records error:', error);
    return NextResponse.json([], { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { type, livestock_id, ...data } = body;

    if (type === 'vaccine') {
      const query = `
        INSERT INTO livestock_vaccinations (livestock_id, vaccine_name, vaccination_date, veterinarian, batch_number) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      const values = [livestock_id, data.name, data.date, data.vet, data.batch];
      await client.query(query, values);

    } else if (type === 'treatment') {
      const query = `
        INSERT INTO livestock_treatments (livestock_id, condition, medication, treatment_date, dosage, duration, veterinarian, notes) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const values = [livestock_id, data.condition, data.medication, data.date, data.dosage, data.duration, data.vet, data.notes];
      await client.query(query, values);

    } else if (type === 'weight') {
      // 1. Log the weight history
      const logQuery = `
        INSERT INTO livestock_weight_logs (livestock_id, weight_kg, log_date, notes) 
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(logQuery, [livestock_id, data.weight, data.date, data.notes]);

      // 2. Update the main livestock record
      const updateQuery = 'UPDATE livestock SET current_weight_kg = $1 WHERE id = $2';
      await client.query(updateQuery, [data.weight, livestock_id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add record error:', error);
    return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
  } finally {
    client.release();
  }
}
