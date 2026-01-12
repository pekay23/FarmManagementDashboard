import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const items = await sql`SELECT * FROM inventory ORDER BY last_updated DESC`;
    return NextResponse.json(items);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier } = body;

    const newItem = await sql`
      INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, unit_price, status)
      VALUES (${name}, ${category}, ${quantity}, ${unit}, ${threshold}, ${price}, 'In Stock')
      RETURNING *
    `;
    
    return NextResponse.json(newItem[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}
