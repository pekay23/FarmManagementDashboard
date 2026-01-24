import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ✅ Consistent helper for Session Info
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

    const query = is_superadmin 
        ? 'SELECT * FROM expenses ORDER BY expense_date DESC'
        : 'SELECT * FROM expenses WHERE farm_id = $1 ORDER BY expense_date DESC';
    
    const params = is_superadmin ? [] : [farm_id];

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}


export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    // Safety check: Super Admin shouldn't be creating expenses without a farm context
    if (!farm_id) throw new Error('Unauthorized'); 

    const body = await request.json();
    const { title, amount, category, date, notes } = body;

    const query = `
      INSERT INTO expenses (farm_id, title, amount, category, expense_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(query, [farm_id, title, amount, category, date, notes]);
    
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
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

        // ✅ Super Admin can delete ANY expense
        const query = is_superadmin
            ? 'DELETE FROM expenses WHERE id = $1'
            : 'DELETE FROM expenses WHERE id = $1 AND farm_id = $2';
            
        const params = is_superadmin ? [id] : [id, farm_id];

        await client.query(query, params);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
    } finally {
        client.release();
    }
}
