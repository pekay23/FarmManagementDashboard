import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the single settings row
    const settings = await sql`SELECT * FROM farm_settings LIMIT 1`;
    return NextResponse.json(settings[0] || {});
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { farm_name, phone, email, address, receipt_footer, tax_rate } = body;

    // Update the single row (we assume ID exists from the initial INSERT)
    // If you deleted the row, this ensures we update the first one found
    const updated = await sql`
      UPDATE farm_settings 
      SET farm_name = ${farm_name},
          phone = ${phone},
          email = ${email},
          address = ${address},
          receipt_footer = ${receipt_footer},
          tax_rate = ${tax_rate}
      WHERE id = (SELECT id FROM farm_settings LIMIT 1)
      RETURNING *
    `;
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
