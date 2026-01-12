import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET treatments for a specific crop (pass ?crop_id=XYZ)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crop_id = searchParams.get('crop_id');

  if (!crop_id) return NextResponse.json([], { status: 200 });

  try {
    const treatments = await sql`
      SELECT * FROM crop_treatments WHERE crop_id = ${crop_id} ORDER BY treatment_date DESC
    `;
    return NextResponse.json(treatments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 });
  }
}

// ADD a new treatment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes } = body;

    const newTreatment = await sql`
      INSERT INTO crop_treatments (crop_id, treatment_type, product_name, treatment_date, quantity, cost, notes)
      VALUES (${crop_id}, ${treatment_type}, ${product_name}, ${treatment_date}, ${quantity}, ${cost}, ${notes})
      RETURNING *
    `;
    return NextResponse.json(newTreatment[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save treatment' }, { status: 500 });
  }
}
