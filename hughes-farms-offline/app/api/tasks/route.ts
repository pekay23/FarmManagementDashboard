import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await sql`
      SELECT t.*, STRING_AGG(e.full_name, ', ') as assignee_names
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN employees e ON ta.employee_id = e.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, assigned_to_ids, due_date, priority, category } = body;

    const newTask = await sql`
      INSERT INTO tasks (title, description, due_date, priority, category)
      VALUES (${title}, ${description}, ${due_date}, ${priority}, ${category})
      RETURNING id
    `;
    const taskId = newTask[0].id;

    if (assigned_to_ids && assigned_to_ids.length > 0) {
      for (const empId of assigned_to_ids) {
        await sql`INSERT INTO task_assignments (task_id, employee_id) VALUES (${taskId}, ${empId})`;
      }
    }
    
    return NextResponse.json({ success: true, id: taskId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, title, description, assigned_to_ids, due_date, priority, category } = body;

    // Check if it's just a status update or a full edit
    if (status) {
      await sql`UPDATE tasks SET status = ${status} WHERE id = ${id}`;
    } else {
      // Full Edit
      await sql`UPDATE tasks SET title=${title}, description=${description}, due_date=${due_date}, priority=${priority}, category=${category} WHERE id=${id}`;
      // Clear old assignments and add new ones
      await sql`DELETE FROM task_assignments WHERE task_id = ${id}`;
      if (assigned_to_ids && assigned_to_ids.length > 0) {
        for (const empId of assigned_to_ids) {
          await sql`INSERT INTO task_assignments (task_id, employee_id) VALUES (${id}, ${empId})`;
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        await sql`DELETE FROM tasks WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
