import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

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

    const query = `
      SELECT t.*, STRING_AGG(e.full_name, ', ') as assignee_names
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN employees e ON ta.employee_id = e.id
      WHERE t.farm_id = $1 -- 🔒 Scoped to farm
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const result = await client.query(query, [farm_id]);
    
    const rows = result.rows.map(row => ({
      ...row,
      priority: toTitleCase(row.priority),
      status: toTitleCase(row.status),
      dueDate: row.due_date, 
      assignedTo: row.assignee_names
    }));

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json([], { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { title, description, assigned_to_ids, due_date, priority, category, status } = body;

    const dbPriority = priority?.toLowerCase() || 'medium';
    const dbStatus = status?.toLowerCase() || 'pending';
    const dbCategory = category || 'General';

    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO tasks (farm_id, title, description, due_date, priority, category, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      farm_id, // 🔒 Bind to farm
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
        // Need to insert farm_id into task_assignments as well
        await client.query(
            'INSERT INTO task_assignments (farm_id, task_id, employee_id) VALUES ($1, $2, $3)', 
            [farm_id, newTask.id, empId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...newTask, success: true }); 

  } catch (error: any) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    console.error('Create task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add task' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
 const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const body = await request.json();
    const { id, status, title, description, assigned_to_ids, due_date, priority, category } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await client.query('BEGIN');

    const updateQuery = `
      UPDATE tasks 
      SET 
        title = $1, 
        description = $2, 
        due_date = $3, 
        priority = $4, 
        category = $5, 
        status = $6 
      WHERE id = $7 AND farm_id = $8 -- 🔒 Scoped Update
      RETURNING *
    `;
    const res = await client.query(updateQuery, [
        title, 
        description, 
        due_date, 
        priority?.toLowerCase(), 
        category || 'General', 
        status?.toLowerCase(), 
        id,
        farm_id
    ]);
    
    if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const updatedTask = res.rows[0];

    // Re-do Assignments
    if (assigned_to_ids && Array.isArray(assigned_to_ids)) {
        await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
        
        const uniqueEmpIds = [...new Set(assigned_to_ids)].filter(Boolean);
        for (const empId of uniqueEmpIds) {
          await client.query(
              'INSERT INTO task_assignments (farm_id, task_id, employee_id) VALUES ($1, $2, $3)', 
              [farm_id, id, empId]
          );
        }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...updatedTask, success: true });

  } catch (error: any) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    const { id } = await request.json();
    
    await client.query('BEGIN');
    
    // Check ownership first
    const check = await client.query('SELECT id FROM tasks WHERE id = $1 AND farm_id = $2', [id, farm_id]);
    if (check.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
    await client.query('DELETE FROM tasks WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    return NextResponse.json({ error: 'Failed to delete' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
