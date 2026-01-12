import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await sql`
      SELECT e.*,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as active_count,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
      FROM employees e
      LEFT JOIN tasks t ON e.id = t.assigned_to
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    return NextResponse.json(Array.isArray(employees) ? employees : []);
  } catch (error) {
    console.error("GET Employee Error:", error); // Check your terminal for this!
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, role, contact_info } = body;
    
    const newEmp = await sql`
      INSERT INTO employees (full_name, role, contact_info) 
      VALUES (${full_name}, ${role}, ${contact_info}) 
      RETURNING *
    `;
    return NextResponse.json(newEmp[0]);
  } catch (error) {
    console.error("POST Employee Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
