import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// DELETE ITEM
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params; // Await the params first
    const id = params.id;
    
    await sql`DELETE FROM inventory WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}

// UPDATE ITEM
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    
    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier } = body;

    const updatedItem = await sql`
      UPDATE inventory 
      SET item_name = ${name}, 
          category = ${category}, 
          quantity = ${quantity}, 
          unit = ${unit}, 
          min_threshold = ${threshold}, 
          unit_price = ${price}, 
          supplier = ${supplier},
          last_updated = CURRENT_TIMESTAMP  -- This updates the date automatically
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(updatedItem[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
