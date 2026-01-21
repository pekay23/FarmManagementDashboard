import { NextResponse } from 'next/server';
import pool from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    // FIX: Map database columns (snake_case) to App interface (camelCase/standard)
    const query = `
      SELECT 
        s.id, 
        s.buyer_name as customer,      -- Map buyer_name -> customer
        s.contact_info, 
        s.total_amount as amount,      -- Map total_amount -> amount
        s.sale_date as date,           -- Map sale_date -> date
        s.status,
        json_agg(
          json_build_object(
            'name', si.item_name, 
            'qty', si.quantity, 
            'price', si.price_at_sale
          )
        ) as "itemsData"               -- Map aggregated items to itemsData
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `;

    const result = await client.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    // The OfflineSync sends 'buyer_name' and 'total_amount' now to match server expectations
    // OR it sends 'customer' and we map it here. 
    // Let's handle both just to be safe.
    const buyerName = body.buyer_name || body.customer;
    const totalAmount = body.total_amount || body.amount;
    const contactInfo = body.contact_info;
    const items = body.items || body.itemsData || []; // Handle both item formats
    const deductInventory = body.deduct_inventory;

    await client.query('BEGIN');

    // 1. Insert Sale (Using actual DB column names)
    const saleQuery = `
      INSERT INTO sales (buyer_name, contact_info, total_amount, status, sale_date)
      VALUES ($1, $2, $3, 'Completed', CURRENT_TIMESTAMP)
      RETURNING id
    `;
    const saleResult = await client.query(saleQuery, [buyerName, contactInfo, totalAmount]);
    const saleId = saleResult.rows[0].id;

    // 2. Insert Items
    for (const item of items) {
      const itemQuery = `
        INSERT INTO sale_items (sale_id, item_name, quantity, price_at_sale)
        VALUES ($1, $2, $3, $4)
      `;
      // Handle item structure variations
      const name = item.item_name || item.name;
      const qty = item.quantity || item.qty;
      const price = item.price_at_sale || item.price;

      await client.query(itemQuery, [saleId, name, qty, price]);

      // 3. Deduct Inventory
      if (deductInventory) {
        const inventoryQuery = `
          UPDATE inventory 
          SET quantity = quantity - $1,
              last_updated = CURRENT_TIMESTAMP
          WHERE item_name = $2
        `;
        await client.query(inventoryQuery, [qty, name]);
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, id: saleId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Record sale error:', error);
    return NextResponse.json({ error: 'Failed to record sale' }, { status: 500 });
  } finally {
    client.release();
  }
}
