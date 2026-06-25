import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import bcrypt from 'bcryptjs';
import { apiErrorResponse, emailValue, idValue, logAudit, readJson, requirePermission, text } from '@/lib/api';

export const dynamic = 'force-dynamic';

// 1. GET: List users
export async function GET() {
  // ✅ OPTIMIZED: Use pool.query directly
  try {
    const { farm_id, is_superadmin } = await requirePermission('users:manage');
    
    // ✅ FIX: Ensure Super Admin query joins farms table to show Farm Name
    const query = is_superadmin
      ? `SELECT u.id, u.email, u.created_at, u.is_superadmin, f.name as farm_name 
         FROM users u 
         LEFT JOIN farms f ON u.farm_id = f.id 
         ORDER BY u.created_at DESC`
      : 'SELECT id, email, created_at FROM users WHERE farm_id = $1 ORDER BY created_at DESC';
    
    const params = is_superadmin ? [] : [farm_id];
    
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to fetch users');
  }
}

// ... POST, PUT, DELETE remain the same (they use pool.connect for transactions, which is correct) ...
// (I will paste the rest of the file below to ensure you have the full working version)

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('users:manage');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const email = emailValue(body.email);
    const password = text(body.password, 'password', { max: 200 });
    const farm_name = text(body.farm_name, 'farm_name', { required: false, max: 160 });

    if (password.length < 12) {
      return NextResponse.json({ error: 'Password must be at least 12 characters' }, { status: 400 });
    }

    await client.query('BEGIN');

    const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    let finalFarmId = is_superadmin ? null : farm_id;

    if (is_superadmin && farm_name) {
        const farmRes = await client.query(
            "INSERT INTO farms (name) VALUES ($1) RETURNING id", 
            [farm_name]
        );
        finalFarmId = farmRes.rows[0].id;
    } else if (is_superadmin && !farm_name) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Farm Name is required' }, { status: 400 });
    }

    if (!finalFarmId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Farm ID is missing' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await client.query(
      `INSERT INTO users (email, password, farm_id, is_superadmin) 
       VALUES ($1, $2, $3, FALSE) 
       RETURNING id, email`,
      [email, hashedPassword, finalFarmId]
    );

    await client.query('COMMIT');
    await logAudit(session, 'user.created', 'user', result.rows[0].id, { email, farm_id: finalFarmId });
    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return apiErrorResponse(error, 'Failed to create user');
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('users:manage');
    const { farm_id, is_superadmin } = session;
    const body = await readJson(request);
    const id = idValue(body.id, 'user_id');
    const password = text(body.password, 'password', { required: false, max: 200 });

    let query: string;
    let values: Array<string | number | null>;
    
    const whereClause = is_superadmin ? "WHERE id = $2" : "WHERE id = $2 AND farm_id = $3";
    
    if (password) {
      if (password.length < 12) {
        return NextResponse.json({ error: 'Password must be at least 12 characters' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE users SET password = $1 ${whereClause} RETURNING id, email`;
      values = [hashedPassword, id];
    } else {
      return NextResponse.json({ message: "Nothing to update" });
    }

    if (!is_superadmin) values.push(farm_id); 

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    await logAudit(session, 'user.updated', 'user', id, { password_changed: Boolean(password) });
    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to update user');
  } finally {
    client.release();
  }
}

// 4. DELETE: Remove a user from THIS farm
export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('users:manage');
    const { farm_id, is_superadmin, user_id } = session;
    const body = await readJson(request);
    const id = idValue(body.id, 'user_id');

    if (id === user_id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const query = is_superadmin 
      ? 'DELETE FROM users WHERE id = $1 AND is_superadmin = FALSE' 
      : 'DELETE FROM users WHERE id = $1 AND farm_id = $2';
    
    const params = is_superadmin ? [id] : [id, farm_id];
    const res = await client.query(query, params);
    
    if (res.rowCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    await logAudit(session, 'user.deleted', 'user', id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, 'Failed to delete user');
  } finally {
    client.release();
  }
}
