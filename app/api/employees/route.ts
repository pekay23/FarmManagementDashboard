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
  // ✅ OPTIMIZED: Uses pool.query directly
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    const whereClause = is_superadmin ? "" : "WHERE e.farm_id = $1";
    const params = is_superadmin ? [] : [farm_id];

    const query = `
      SELECT 
        e.id, e.full_name, e.role, e.contact_info, e.created_at, e.status, e.farm_id,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as active_count,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
      FROM employees e
      LEFT JOIN task_assignments ta ON e.id = ta.employee_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Fetch employees error:', error);
    return NextResponse.json([], { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}


// POST, PUT, DELETE: Strictly require farm_id context
// (Assuming Super Admin doesn't need to CREATE employees via API directly without a farm context)

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    // Safety: If super admin tries to create without a farm_id context, this will be null/undefined.
    // For robust SaaS, you might want to pass farm_id in body if Super Admin.
    // For now, let's keep it simple: strict farm owner only.
    if (!farm_id) throw new Error('Unauthorized'); 

    const text = await request.text();
    if (!text) return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    
    const body = JSON.parse(text);
    const { full_name, role, contact_info, status } = body;

    const query = `
      INSERT INTO employees (farm_id, full_name, role, contact_info, status) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;

    const values = [farm_id, full_name, role, contact_info, status || 'Active'];
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    if (!farm_id) throw new Error('Unauthorized');

    const text = await request.text();
    if (!text) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    
    const body = JSON.parse(text);
    const { id, full_name, role, contact_info, status } = body;

    const query = `
      UPDATE employees 
      SET full_name = $1, 
          role = $2, 
          contact_info = $3, 
          status = $4 
      WHERE id = $5 AND farm_id = $6 -- 🔒 Scoped update
      RETURNING *
    `;

    const values = [full_name, role, contact_info, status, id, farm_id];
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id } = await getSessionInfo();
    if (!farm_id) throw new Error('Unauthorized');

    const text = await request.text();
    if (!text) return NextResponse.json({ error: 'Empty body' }, { status: 400 });

    const body = JSON.parse(text);
    const { id } = body;

    const query = 'DELETE FROM employees WHERE id = $1 AND farm_id = $2';
    const res = await client.query(query, [id, farm_id]);

    if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
