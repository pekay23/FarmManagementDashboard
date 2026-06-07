import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import {
  ApiError,
  apiErrorResponse,
  enumValue,
  getSessionInfo,
  idValue,
  logAudit,
  readJson,
  requirePermission,
  text,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

const taskPriorities = ['low', 'medium', 'high'] as const;
const taskStatuses = ['pending', 'in progress', 'completed'] as const;

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

function assignmentIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeTaskPayload(body: Record<string, unknown>) {
  return {
    title: text(body.title, 'title', { max: 180 }),
    description: text(body.description, 'description', { required: false, max: 2000 }),
    due_date: text(body.due_date || body.dueDate, 'due_date', { required: false, max: 40 }) || null,
    priority: enumValue(body.priority, 'priority', taskPriorities, 'medium'),
    category: text(body.category, 'category', { required: false, max: 80 }) || 'General',
    status: enumValue(body.status, 'status', taskStatuses, 'pending'),
    assigned_to_ids: assignmentIds(body.assigned_to_ids),
  };
}

export async function GET() {
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    const whereClause = is_superadmin ? '' : 'WHERE t.farm_id = $1';
    const params = is_superadmin ? [] : [farm_id];

    const query = `
      SELECT t.*, STRING_AGG(e.full_name, ', ') as assignee_names
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN employees e ON ta.employee_id = e.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const result = await pool.query(query, params);

    const rows = result.rows.map((row: any) => ({
      ...row,
      priority: toTitleCase(row.priority),
      status: toTitleCase(row.status),
      dueDate: row.due_date,
      assignedTo: row.assignee_names,
    }));

    return NextResponse.json(rows);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to fetch tasks');
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('tasks:write');
    if (!session.farm_id) throw new ApiError('Farm workspace required', 403);
    const { farm_id } = session;
    const body = await readJson(request);
    const task = normalizeTaskPayload(body);

    await client.query('BEGIN');

    const result = await client.query(
      `
      INSERT INTO tasks (farm_id, title, description, due_date, priority, category, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [farm_id, task.title, task.description, task.due_date, task.priority, task.category, task.status]
    );
    const newTask = result.rows[0];

    for (const empId of task.assigned_to_ids) {
      await client.query('INSERT INTO task_assignments (farm_id, task_id, employee_id) VALUES ($1, $2, $3)', [
        farm_id,
        newTask.id,
        empId,
      ]);
    }

    await client.query('COMMIT');
    await logAudit(session, 'task.created', 'task', newTask.id, { title: task.title, priority: task.priority });
    return NextResponse.json({ ...newTask, success: true });
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    return apiErrorResponse(error, 'Failed to add task');
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('tasks:write');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const id = idValue(body.id);
    const task = normalizeTaskPayload(body);

    await client.query('BEGIN');

    const whereClause = is_superadmin ? 'WHERE id = $7' : 'WHERE id = $7 AND farm_id = $8';
    const params: Array<string | number | null> = [
      task.title,
      task.description,
      task.due_date,
      task.priority,
      task.category,
      task.status,
      id,
    ];
    if (!is_superadmin) {
      if (!farm_id) throw new ApiError('Unauthorized', 401);
      params.push(farm_id);
    }

    const res = await client.query(
      `
      UPDATE tasks
      SET title = $1, description = $2, due_date = $3, priority = $4, category = $5, status = $6
      ${whereClause}
      RETURNING *
    `,
      params
    );

    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const updatedTask = res.rows[0];

    if (Array.isArray(body.assigned_to_ids)) {
      await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
      for (const empId of task.assigned_to_ids) {
        await client.query('INSERT INTO task_assignments (farm_id, task_id, employee_id) VALUES ($1, $2, $3)', [
          updatedTask.farm_id,
          id,
          empId,
        ]);
      }
    }

    await client.query('COMMIT');
    await logAudit(session, 'task.updated', 'task', id, { title: task.title, status: task.status });
    return NextResponse.json({ ...updatedTask, success: true });
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    return apiErrorResponse(error, 'Failed to update task');
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('tasks:write');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const id = idValue(body.id);

    await client.query('BEGIN');

    let checkQuery = 'SELECT id FROM tasks WHERE id = $1';
    const checkParams: Array<string | number> = [id];

    if (!is_superadmin) {
      if (!farm_id) throw new ApiError('Unauthorized', 401);
      checkQuery += ' AND farm_id = $2';
      checkParams.push(farm_id);
    }

    const check = await client.query(checkQuery, checkParams);
    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
    await client.query('DELETE FROM tasks WHERE id = $1', [id]);

    await client.query('COMMIT');
    await logAudit(session, 'task.deleted', 'task', id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    return apiErrorResponse(error, 'Failed to delete task');
  } finally {
    client.release();
  }
}
