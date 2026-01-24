import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// --- SECURITY HELPER ---
async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Forbidden');
  
  const user = session.user as any;
  if (user.role !== 'Admin' && !user.is_superadmin) {
      throw new Error('Forbidden');
  }
  return {
      farm_id: user.farm_id,
      is_superadmin: user.is_superadmin,
      user_id: user.id
  };
}

// 1. GET: List users
export async function GET() {
  // ✅ OPTIMIZED: Use pool.query directly
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    
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
  } catch (error: any) {
    console.error("GET Users Error:", error); // This will show up in your terminal
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// ... POST, PUT, DELETE remain the same (they use pool.connect for transactions, which is correct) ...
// (I will paste the rest of the file below to ensure you have the full working version)

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const body = await request.json();
    const { email, password, farm_name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
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
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const body = await request.json();
    const { id, password } = body;

    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    let query;
    let values;
    
    const whereClause = is_superadmin ? "WHERE id = $2" : "WHERE id = $2 AND farm_id = $3";
    
    if (password) {
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
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// 4. DELETE: Remove a user from THIS farm
export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { farm_id, is_superadmin, user_id } = await getSessionInfo();
    const { id } = await request.json();

    if (id === user_id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const query = is_superadmin 
      ? 'DELETE FROM users WHERE id = $1' 
      : 'DELETE FROM users WHERE id = $1 AND farm_id = $2';
    
    const params = is_superadmin ? [id] : [id, farm_id];
    const res = await client.query(query, params);
    
    if (res.rowCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}