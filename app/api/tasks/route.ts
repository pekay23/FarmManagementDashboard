import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 

export const dynamic = 'force-dynamic';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export async function GET() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT t.*, STRING_AGG(e.full_name, ', ') as assignee_names
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN employees e ON ta.employee_id = e.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const result = await client.query(query);
    
    const rows = result.rows.map(row => ({
      ...row,
      priority: toTitleCase(row.priority),
      status: toTitleCase(row.status),
      dueDate: row.due_date, 
      assignedTo: row.assignee_names
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json([], { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { title, description, assigned_to_ids, due_date, priority, category, status } = body;

    const dbPriority = priority?.toLowerCase() || 'medium';
    const dbStatus = status?.toLowerCase() || 'pending';
    const dbCategory = category || 'General';

    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO tasks (title, description, due_date, priority, category, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      title, 
      description, 
      due_date, 
      dbPriority, 
      dbCategory, 
      dbStatus
    ]);
    const newTask = result.rows[0];

    if (assigned_to_ids && Array.isArray(assigned_to_ids) && assigned_to_ids.length > 0) {
      const uniqueEmpIds = [...new Set(assigned_to_ids)].filter(Boolean);
      for (const empId of uniqueEmpIds) {
        await client.query('INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)', [newTask.id, empId]);
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...newTask, success: true }); 

  } catch (error: any) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    console.error('Create task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add task' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
 const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, status, title, description, assigned_to_ids, due_date, priority, category } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await client.query('BEGIN');

    // ✅ FIX: Simplified to a single, comprehensive UPDATE query
    const updateQuery = `
      UPDATE tasks 
      SET 
        title = $1, 
        description = $2, 
        due_date = $3, 
        priority = $4, 
        category = $5, 
        status = $6 
      WHERE id = $7
      RETURNING *
    `;
    const res = await client.query(updateQuery, [
        title, 
        description, 
        due_date, 
        priority?.toLowerCase(), 
        category || 'General', 
        status?.toLowerCase(), // Ensure status is updated
        id
    ]);
    const updatedTask = res.rows[0];

    // Re-do Assignments if they are provided
    if (assigned_to_ids && Array.isArray(assigned_to_ids)) {
        await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
        const uniqueEmpIds = [...new Set(assigned_to_ids)].filter(Boolean);
        for (const empId of uniqueEmpIds) {
          await client.query('INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)', [id, empId]);
        }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...updatedTask, success: true });

  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ✅ DELETE HANDLER ADDED
export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { id } = await request.json();
    
    await client.query('BEGIN');
    await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
    await client.query('DELETE FROM tasks WHERE id = $1', [id]);
    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  } finally {
    client.release();
  }
}
