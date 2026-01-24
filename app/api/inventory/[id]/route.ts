import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// DELETE ITEM
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session) throw new Error('Unauthorized');

    const params = await props.params;
    const id = params.id;
    
    // ✅ Super Admin can delete ANY item by ID
    // ✅ Client can only delete THEIR item
    const query = user.is_superadmin 
        ? 'DELETE FROM inventory WHERE id = $1'
        : 'DELETE FROM inventory WHERE id = $1 AND farm_id = $2';
    
    const queryParams = user.is_superadmin ? [id] : [id, user.farm_id];

    const result = await client.query(query, queryParams);
    
    if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

// UPDATE ITEM
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session) throw new Error('Unauthorized');

    const params = await props.params;
    const id = params.id;
    const body = await request.json();
    const { name, category, quantity, unit, threshold, price, supplier } = body;

    // ✅ Super Admin can update ANY item (Optional, but included logic here)
    const whereClause = user.is_superadmin ? "WHERE id = $8" : "WHERE id = $8 AND farm_id = $9";
    
    const query = `
      UPDATE inventory 
      SET item_name = $1, category = $2, quantity = $3, unit = $4, 
          min_threshold = $5, unit_price = $6, supplier = $7, last_updated = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING *
    `;

    const values = [name, category, quantity, unit, threshold, price, supplier, id];
    if (!user.is_superadmin) values.push(user.farm_id); // Add farm_id param if not super admin

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
