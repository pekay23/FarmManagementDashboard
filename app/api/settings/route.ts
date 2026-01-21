import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Server DB connection

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM farm_settings LIMIT 1');
    return NextResponse.json(result.rows[0] || {});
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { farm_name, phone, email, address, receipt_footer, tax_rate } = body;

    // Check if settings exist
    const check = await client.query('SELECT id FROM farm_settings LIMIT 1');
    
    let result;
    if (check.rows.length > 0) {
      // UPDATE existing
      const query = `
        UPDATE farm_settings 
        SET farm_name = $1,
            phone = $2,
            email = $3,
            address = $4,
            receipt_footer = $5,
            tax_rate = $6
        WHERE id = $7
        RETURNING *
      `;
      result = await client.query(query, [farm_name, phone, email, address, receipt_footer, tax_rate, check.rows[0].id]);
    } else {
      // INSERT new (First time setup)
      const query = `
        INSERT INTO farm_settings (farm_name, phone, email, address, receipt_footer, tax_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      result = await client.query(query, [farm_name, phone, email, address, receipt_footer, tax_rate]);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  } finally {
    client.release();
  }
}
