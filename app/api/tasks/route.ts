import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 

export const dynamic = 'force-dynamic';

// Helper: Capitalize first letter (medium -> Medium)
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
    
    // Normalize data for the Frontend (Database is lowercase, App wants Title Case)
    const normalizedRows = result.rows.map(row => ({
      ...row,
      priority: toTitleCase(row.priority),
      status: toTitleCase(row.status),
      // Ensure date is ISO string for the app
      dueDate: row.due_date, 
      assignedTo: row.assignee_names
    }));

    return NextResponse.json(normalizedRows);
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
    const { title, description, assigned_to_ids, due_date, priority, category } = body;

    // FIX: Convert to lowercase to satisfy Database Constraints
    const dbPriority = priority?.toLowerCase() || 'medium';
    // Use body status if provided (for sync), otherwise default to 'pending'
    const dbStatus = (body.status?.toLowerCase() || 'pending');

    await client.query('BEGIN');

    // 1. Create Task
    const insertQuery = `
      INSERT INTO tasks (title, description, due_date, priority, category, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await client.query(insertQuery, [
      title, 
      description, 
      due_date, 
      dbPriority, 
      category, 
      dbStatus
    ]);
    const taskId = result.rows[0].id;

    // 2. Assign Employees
    if (assigned_to_ids && Array.isArray(assigned_to_ids) && assigned_to_ids.length > 0) {
      for (const empId of assigned_to_ids) {
        // Ensure empId is valid before inserting
        if (empId) {
            await client.query('INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)', [taskId, empId]);
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, id: taskId });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    // Return the actual DB error to help debugging
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

    await client.query('BEGIN');

    if (status) {
      // Status Update
      const dbStatus = status.toLowerCase();
      await client.query('UPDATE tasks SET status = $1 WHERE id = $2', [dbStatus, id]);
    } else {
      // Full Edit
      const dbPriority = priority?.toLowerCase();
      
      const updateQuery = `
        UPDATE tasks 
        SET title=$1, description=$2, due_date=$3, priority=$4, category=$5 
        WHERE id=$6
      `;
      await client.query(updateQuery, [title, description, due_date, dbPriority, category, id]);

      // Re-do Assignments
      await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
      
      if (assigned_to_ids && Array.isArray(assigned_to_ids) && assigned_to_ids.length > 0) {
        for (const empId of assigned_to_ids) {
          if (empId) {
            await client.query('INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)', [id, empId]);
          }
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { id } = await request.json();
    
    await client.query('BEGIN');
    // Delete assignments first (Foreign Key constraint)
    await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
    await client.query('DELETE FROM tasks WHERE id = $1', [id]);
    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  } finally {
    client.release();
  }
}
