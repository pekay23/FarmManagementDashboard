import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    // Fetch crops with their latest treatment count or simple details
    const crops = await sql`
      SELECT * FROM crops ORDER BY planting_date DESC
    `;
    return NextResponse.json(crops);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch crops' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plot_number, crop_type, variety, planting_date, expected_harvest_date, plot_size_acres, location, estimated_yield_kg } = body;

    const newCrop = await sql`
      INSERT INTO crops (plot_number, crop_type, variety, planting_date, expected_harvest_date, plot_size_acres, location, estimated_yield_kg, status)
      VALUES (${plot_number}, ${crop_type}, ${variety}, ${planting_date}, ${expected_harvest_date}, ${plot_size_acres}, ${location}, ${estimated_yield_kg}, 'growing')
      RETURNING *
    `;
    
    return NextResponse.json(newCrop[0]);
  } catch (error) {
    console.error('Error adding crop:', error);
    return NextResponse.json({ error: 'Failed to add crop' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, plot_number, crop_type, variety, planting_date, expected_harvest_date, 
      plot_size_acres, location, estimated_yield_kg, status, 
      actual_yield_kg, harvest_notes // <-- New fields
    } = body;

    const updatedCrop = await sql`
      UPDATE crops
      SET plot_number = ${plot_number},
          crop_type = ${crop_type},
          variety = ${variety},
          planting_date = ${planting_date},
          expected_harvest_date = ${expected_harvest_date},
          plot_size_acres = ${plot_size_acres},
          location = ${location},
          estimated_yield_kg = ${estimated_yield_kg},
          actual_yield_kg = ${actual_yield_kg}, -- Update actual yield
          harvest_notes = ${harvest_notes},     -- Update notes
          status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(updatedCrop[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update crop' }, { status: 500 });
  }
}
