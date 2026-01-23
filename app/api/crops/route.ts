import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM crops ORDER BY planting_date DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { 
      plot_number, crop_type, variety, planting_date, 
      expected_harvest_date, plot_size_acres, location, estimated_yield_kg,
      status
    } = body;
    const query = `
      INSERT INTO crops (
        plot_number, crop_type, variety, planting_date, 
        expected_harvest_date, plot_size_acres, location, 
        estimated_yield_kg, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *
    `;
    const values = [
      plot_number, crop_type, variety, planting_date, 
      expected_harvest_date, plot_size_acres, location, estimated_yield_kg, 
      status || 'Growing'
    ];
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
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
      WHERE id = $12
      RETURNING *
    `;
    const values = [
      plot_number, crop_type, variety, planting_date, expected_harvest_date,
      plot_size_acres, location, estimated_yield_kg, actual_yield_kg, 
      harvest_notes, status, id
    ];
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ✅ DELETE HANDLER ADDED
export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await client.query('BEGIN');
        
        // Delete associated treatments first to prevent foreign key errors
        await client.query('DELETE FROM crop_treatments WHERE crop_id = $1', [id]);
        
        // Then delete the crop record
        await client.query('DELETE FROM crops WHERE id = $1', [id]);
        
        await client.query('COMMIT');

        return NextResponse.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete crop error:', error);
        return NextResponse.json({ error: 'Failed to delete crop' }, { status: 500 });
    } finally {
        client.release();
    }
}
