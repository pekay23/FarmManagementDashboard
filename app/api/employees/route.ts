import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    // We use standard SQL syntax here with standard quotes
    const query = `
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

    const result = await client.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json([], { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { full_name, role, contact_info } = body;

    const query = `
      INSERT INTO employees (full_name, role, contact_info, status) 
      VALUES ($1, $2, $3, 'Active') 
      RETURNING *
    `;

    const values = [full_name, role, contact_info];
    
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, full_name, role, contact_info, status } = body;

    const query = `
      UPDATE employees 
      SET full_name = $1, 
          role = $2, 
          contact_info = $3, 
          status = $4 
      WHERE id = $5
    `;

    const values = [full_name, role, contact_info, status, id];

    await client.query(query, values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { id } = await request.json();

    const query = 'DELETE FROM employees WHERE id = $1';
    await client.query(query, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  } finally {
    client.release();
  }
}
