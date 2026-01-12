import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch sales with their items aggregated
    const sales = await sql`
      SELECT 
        s.*, 
        json_agg(json_build_object('name', si.item_name, 'qty', si.quantity, 'price', si.price_at_sale)) as items_data 
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `;
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyer_name, contact_info, total_amount, items, deduct_inventory } = body;

    // 1. Create Sale Record
    const newSale = await sql`
      INSERT INTO sales (buyer_name, contact_info, total_amount, status)
      VALUES (${buyer_name}, ${contact_info}, ${total_amount}, 'completed')
      RETURNING id
    `;
    const saleId = newSale[0].id;

    // 2. Process Items
    for (const item of items) {
      // Save Item Record
      await sql`
        INSERT INTO sale_items (sale_id, item_name, quantity, price_at_sale)
        VALUES (${saleId}, ${item.name}, ${item.qty}, ${item.price})
      `;

      // 3. Auto-Deduct Inventory (if enabled)
      if (deduct_inventory) {
        // We try to match item name exactly. 
        // In a real app, you'd use IDs, but names work for this scale.
        await sql`
          UPDATE inventory 
          SET quantity = quantity - ${item.qty}
          WHERE item_name = ${item.name}
        `;
      }
    }

    return NextResponse.json({ success: true, id: saleId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to record sale' }, { status: 500 });
  }
}
