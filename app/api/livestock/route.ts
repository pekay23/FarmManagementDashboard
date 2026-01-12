import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sql`SELECT * FROM livestock ORDER BY created_at DESC`;
    
    // Safety check: Ensure we return a clean array
    // Sometimes the driver returns the array directly, sometimes inside a .rows property
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;

    const newAnimal = await sql`
      INSERT INTO livestock (animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status)
      VALUES (${animal_id}, ${species}, ${breed}, ${sex}, ${date_of_birth}, ${current_weight_kg}, ${health_status || 'Healthy'})
      RETURNING *
    `;
    
    // Return the single created object
    return NextResponse.json(Array.isArray(newAnimal) ? newAnimal[0] : newAnimal);
  } catch (error) {
    console.error("Insert Error:", error);
    return NextResponse.json({ error: 'Failed to add animal' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, animal_id, species, breed, sex, date_of_birth, current_weight_kg, health_status } = body;

    const updated = await sql`
      UPDATE livestock
      SET animal_id = ${animal_id},
          species = ${species},
          breed = ${breed},
          sex = ${sex},
          date_of_birth = ${date_of_birth},
          current_weight_kg = ${current_weight_kg},
          health_status = ${health_status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(Array.isArray(updated) ? updated[0] : updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 });
  }
}
