import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
  };
}

export async function GET() {
  // ✅ OPTIMIZED
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    const whereClause = is_superadmin ? "" : "WHERE s.farm_id = $1";
    const params = is_superadmin ? [] : [farm_id];

    const query = `
      SELECT 
        s.id, 
        s.buyer_name as customer,
        s.contact_info, 
        s.total_amount as amount,
        s.sale_date as date,
        s.sale_date as created_at,
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
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}


export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    if (!farm_id) throw new Error('Unauthorized'); // Strict: Only farm owners can create

    const body = await request.json();
    const buyerName = body.buyer_name || body.customer;
    const totalAmount = body.total_amount || body.amount;
    const contactInfo = body.contact_info;
    const items = body.items || body.itemsData || [];
    const deductInventory = body.deduct_inventory;

    await client.query('BEGIN');

    // 1. Insert Sale
    const saleQuery = `
      INSERT INTO sales (farm_id, buyer_name, contact_info, total_amount, status, sale_date)
      VALUES ($1, $2, $3, $4, 'Completed', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const saleResult = await client.query(saleQuery, [farm_id, buyerName, contactInfo, totalAmount]);
    const newSale = saleResult.rows[0];

    // 2. Insert Items
    for (const item of items) {
      const name = item.item_name || item.name;
      const qty = item.quantity || item.qty;
      const price = item.price_at_sale || item.price;

      await client.query(
        'INSERT INTO sale_items (farm_id, sale_id, item_name, quantity, price_at_sale) VALUES ($1, $2, $3, $4, $5)', 
        [farm_id, newSale.id, name, qty, price]
      );

      // 3. Deduct Inventory
      if (deductInventory) {
        await client.query(
          'UPDATE inventory SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP WHERE item_name = $2 AND farm_id = $3',
          [qty, name, farm_id]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
        id: newSale.id,
        customer: newSale.buyer_name,
        contact_info: newSale.contact_info,
        amount: newSale.total_amount,
        date: newSale.sale_date,
        itemsData: items,
        created_at: newSale.sale_date 
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Record sale error:', error);
    return NextResponse.json({ error: 'Failed to record sale' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const { id } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await client.query('BEGIN');
    
    // ✅ Logic: Super Admin can delete ANY sale. Client restricted by farm_id.
    let checkQuery = 'SELECT id FROM sales WHERE id = $1';
    let checkParams = [id];

    if (!is_superadmin) {
        if (!farm_id) throw new Error('Unauthorized');
        checkQuery += ' AND farm_id = $2';
        checkParams.push(farm_id);
    }

    const check = await client.query(checkQuery, checkParams);
    if (check.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Sale not found or access denied' }, { status: 404 });
    }

    // Delete items first
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    
    // Delete the sale record
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Delete sale error:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
