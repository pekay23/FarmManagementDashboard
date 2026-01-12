import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await sql`
      SELECT 
        e.id, e.full_name, e.role, e.contact_info, e.created_at, e.status,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as active_count,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
      FROM employees e
      LEFT JOIN task_assignments ta ON e.id = ta.employee_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, role, contact_info } = body;
    const newEmp = await sql`
      INSERT INTO employees (full_name, role, contact_info, status) 
      VALUES (${full_name}, ${role}, ${contact_info}, 'Active') 
      RETURNING *
    `;
    return NextResponse.json(newEmp[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name, role, contact_info, status } = body;
    await sql`
      UPDATE employees 
      SET full_name = ${full_name}, 
          role = ${role}, 
          contact_info = ${contact_info}, 
          status = ${status} 
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        // Tasks assigned will be set to NULL due to schema constraint
        await sql`DELETE FROM employees WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
