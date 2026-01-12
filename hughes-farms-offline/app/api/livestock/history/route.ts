import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type'); 

  if (!id || !type) return NextResponse.json([]);

  try {
    let data;
    if (type === 'vaccines') {
      data = await sql`SELECT * FROM livestock_vaccinations WHERE livestock_id = ${id} ORDER BY vaccination_date DESC`;
    } else if (type === 'treatments') {
      data = await sql`SELECT * FROM livestock_treatments WHERE livestock_id = ${id} ORDER BY treatment_date DESC`;
    } else if (type === 'weights') {
      data = await sql`SELECT * FROM livestock_weight_logs WHERE livestock_id = ${id} ORDER BY log_date DESC`;
    }
    
    // Safety check for array
    const rows = Array.isArray(data) ? data : (data as any)?.rows || [];
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, livestock_id, ...data } = body;

    if (type === 'vaccine') {
      await sql`INSERT INTO livestock_vaccinations (livestock_id, vaccine_name, vaccination_date, veterinarian, batch_number) VALUES (${livestock_id}, ${data.name}, ${data.date}, ${data.vet}, ${data.batch})`;
    } else if (type === 'treatment') {
      await sql`INSERT INTO livestock_treatments (livestock_id, condition, medication, treatment_date, dosage, duration, veterinarian, notes) VALUES (${livestock_id}, ${data.condition}, ${data.medication}, ${data.date}, ${data.dosage}, ${data.duration}, ${data.vet}, ${data.notes})`;
    } else if (type === 'weight') {
      await sql`INSERT INTO livestock_weight_logs (livestock_id, weight_kg, log_date, notes) VALUES (${livestock_id}, ${data.weight}, ${data.date}, ${data.notes})`;
      // Update main weight as well
      await sql`UPDATE livestock SET current_weight_kg = ${data.weight} WHERE id = ${livestock_id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
  }
}
