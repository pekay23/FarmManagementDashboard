import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await sql`
      SELECT t.*, e.full_name as assignee_name 
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_to = e.id
      ORDER BY t.created_at DESC
    `;
    return NextResponse.json(Array.isArray(tasks) ? tasks : []);
  } catch (error) {
    console.error("GET Task Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Fix: Convert empty string to null for UUID field
    const assigned_to = body.assigned_to === "" ? null : body.assigned_to;

    const newTask = await sql`
      INSERT INTO tasks (title, description, assigned_to, due_date, priority, category, status)
      VALUES (${body.title}, ${body.description}, ${assigned_to}, ${body.due_date}, ${body.priority}, ${body.category}, 'pending')
      RETURNING *
    `;
    return NextResponse.json(newTask[0]);
  } catch (error) {
    console.error("POST Task Error:", error); // Check terminal if this fails
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await sql`UPDATE tasks SET status = ${body.status} WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
