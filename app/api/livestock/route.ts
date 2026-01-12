import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("Fetching livestock...");
    const result = await sql`SELECT * FROM livestock ORDER BY created_at DESC`;
    
    console.log("Raw DB Result:", result);

    // Neon serverless driver usually returns the array of rows directly.
    // But if it returns an object, we try to extract rows.
    let rows = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result && typeof result === 'object' && Array.isArray((result as any).rows)) {
      rows = (result as any).rows;
    } else {
        // Fallback: If we got a single object that looks like a row, wrap it
        rows = [];
    }

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
    
    // Ensure we return the first item of the array
    const created = Array.isArray(newAnimal) ? newAnimal[0] : newAnimal;
    return NextResponse.json(created);
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
    
    const item = Array.isArray(updated) ? updated[0] : updated;
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 });
  }
}
