import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// --- SECURITY HELPER ---
async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'Admin') {
    throw new Error('Forbidden');
  }
  return session;
}

// 1. GET: List all users for THIS farm
export async function GET() {
  try {
    const session = await ensureAdmin();
    const farm_id = (session.user as any).farm_id; // 🔒 Get admin's farm ID

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, role, created_at FROM users WHERE farm_id = $1 ORDER BY created_at DESC', 
        [farm_id]
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// 2. POST: Create a new user for THIS farm
export async function POST(request: Request) {
  try {
    const session = await ensureAdmin();
    const farm_id = (session.user as any).farm_id; // 🔒 Get admin's farm ID
    
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Check if user exists (Globally, email must be unique)
      const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (check.rows.length > 0) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 🔒 INSERT with farm_id
      const result = await client.query(
        'INSERT INTO users (email, password, role, farm_id) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
        [email, hashedPassword, role || 'Viewer', farm_id]
      );

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// 3. PUT: Update a user on THIS farm
export async function PUT(request: Request) {
  try {
    const session = await ensureAdmin();
    const farm_id = (session.user as any).farm_id; // 🔒 Get admin's farm ID
    
    const body = await request.json();
    const { id, password, role } = body;

    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const client = await pool.connect();
    try {
      let query;
      let values;

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        // 🔒 Update ONLY if farm_id matches
        query = 'UPDATE users SET role = $1, password = $2 WHERE id = $3 AND farm_id = $4 RETURNING id, email, role';
        values = [role, hashedPassword, id, farm_id];
      } else {
        // 🔒 Update ONLY if farm_id matches
        query = 'UPDATE users SET role = $1 WHERE id = $2 AND farm_id = $3 RETURNING id, email, role';
        values = [role, id, farm_id];
      }

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
          return NextResponse.json({ error: 'User not found or access denied' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// 4. DELETE: Remove a user from THIS farm
export async function DELETE(request: Request) {
  try {
    const session = await ensureAdmin();
    const farm_id = (session.user as any).farm_id; // 🔒 Get admin's farm ID
    const { id } = await request.json();

    // Prevent Admin from deleting themselves
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // 🔒 Delete ONLY if farm_id matches
      const res = await client.query('DELETE FROM users WHERE id = $1 AND farm_id = $2', [id, farm_id]);
      
      if (res.rowCount === 0) {
          return NextResponse.json({ error: 'User not found or access denied' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}
