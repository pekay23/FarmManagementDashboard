import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to get secure Farm ID
async function getFarmId() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).farm_id) {
    throw new Error('Unauthorized');
  }
  return (session.user as any).farm_id;
}

export async function GET() {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check

    const result = await client.query(
      'SELECT * FROM expenses WHERE farm_id = $1 ORDER BY expense_date DESC', 
      [farm_id]
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
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

// Optional: Added DELETE for completeness since your UI has delete
export async function DELETE(request: Request) {
    const client = await pool.connect();
    try {
        const farm_id = await getFarmId();
        const { id } = await request.json();
        
        await client.query('DELETE FROM expenses WHERE id = $1 AND farm_id = $2', [id, farm_id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    } finally {
        client.release();
    }
}
