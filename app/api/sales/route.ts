import { NextResponse } from 'next/server';
import pool from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.id, 
        s.buyer_name as customer,
        s.contact_info, 
        s.total_amount as amount,
        s.sale_date as date,
        s.sale_date as created_at, -- ✅ ALIAS sale_date as created_at for Sync
        s.status,
        json_agg(
          json_build_object(
            'name', si.item_name, 
            'qty', si.quantity, 
            'price', si.price_at_sale
          )
        ) as "itemsData"
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
    const buyerName = body.buyer_name || body.customer;
    const totalAmount = body.total_amount || body.amount;
    const contactInfo = body.contact_info;
    const items = body.items || body.itemsData || [];
    const deductInventory = body.deduct_inventory;

    await client.query('BEGIN');

    // 1. Insert Sale
    const saleQuery = `
      INSERT INTO sales (buyer_name, contact_info, total_amount, status, sale_date)
      VALUES ($1, $2, $3, 'Completed', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const saleResult = await client.query(saleQuery, [buyerName, contactInfo, totalAmount]);
    const newSale = saleResult.rows[0];

    // 2. Insert Items
    for (const item of items) {
      const name = item.item_name || item.name;
      const qty = item.quantity || item.qty;
      const price = item.price_at_sale || item.price;

      await client.query(
        'INSERT INTO sale_items (sale_id, item_name, quantity, price_at_sale) VALUES ($1, $2, $3, $4)', 
        [newSale.id, name, qty, price]
      );

      // 3. Deduct Inventory
      if (deductInventory) {
        await client.query(
          'UPDATE inventory SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP WHERE item_name = $2',
          [qty, name]
        );
      }
    }

    await client.query('COMMIT');

    // ✅ Return FULL object for SyncContext with created_at mapped
    return NextResponse.json({
        id: newSale.id,
        customer: newSale.buyer_name,
        contact_info: newSale.contact_info,
        amount: newSale.total_amount,
        date: newSale.sale_date,
        itemsData: items,
        created_at: newSale.sale_date // Map sale_date to created_at
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Record sale error:', error);
    return NextResponse.json({ error: 'Failed to record sale' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { id } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await client.query('BEGIN');
    
    // Delete items first (Foreign Key Constraint)
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    
    // Delete the sale record
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    
    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete sale error:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  } finally {
    client.release();
  }
}
