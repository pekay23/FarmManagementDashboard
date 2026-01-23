import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// --- SECURITY HELPER ---
async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  // ✅ Cast user to 'any' to bypass the missing 'role' type error
  if (!session || (session.user as any)?.role !== 'Admin') {
    throw new Error('Forbidden');
  }
  return session;
}

// 1. GET: List all user accounts
export async function GET() {
  try {
    await ensureAdmin();
    const client = await pool.connect();
    try {
      // We don't return passwords for security
      const result = await client.query(
        'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// 2. POST: Create a new user account
export async function POST(request: Request) {
  try {
    await ensureAdmin();
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Check if user exists
      const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (check.rows.length > 0) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await client.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashedPassword, role || 'Viewer']
      );

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// 3. PUT: Update an existing user (Role or Password)
export async function PUT(request: Request) {
  try {
    await ensureAdmin();
    const body = await request.json();
    const { id, password, role } = body;

    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const client = await pool.connect();
    try {
      let query;
      let values;

      if (password) {
        // If password is provided, update both role and password
        const hashedPassword = await bcrypt.hash(password, 10);
        query = 'UPDATE users SET role = $1, password = $2 WHERE id = $3 RETURNING id, email, role';
        values = [role, hashedPassword, id];
      } else {
        // Otherwise, just update the role
        query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role';
        values = [role, id];
      }

      const result = await client.query(query, values);
      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// 4. DELETE: Remove a user account
export async function DELETE(request: Request) {
  try {
    const session = await ensureAdmin();
    const { id } = await request.json();

    // Prevent Admin from deleting themselves
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('DELETE FROM users WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}
