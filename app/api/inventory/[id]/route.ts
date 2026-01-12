import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// DELETE ITEM
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
  { params }: { params: { id: string } }
) {
  try {
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
          supplier = ${supplier}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(updatedItem[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
