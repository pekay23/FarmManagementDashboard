import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import pool from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: Request) {
  const setupToken = process.env.SETUP_ADMIN_TOKEN;
  const providedToken = request.headers.get('x-setup-token');

  if (!setupToken || providedToken !== setupToken) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { email, password, farmName } = await request.json().catch(() => ({}));
  if (!email || !password || password.length < 12) {
    return NextResponse.json(
      { error: 'Email and a 12+ character password are required' },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    const check = await client.query('SELECT id FROM users WHERE is_superadmin = TRUE LIMIT 1');
    if (check.rows.length > 0) {
      return NextResponse.json(
        { error: 'System already initialized. Use the script to create new admins.' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    const finalFarmName = farmName || 'Default Farm';
    const farmCheck = await client.query('SELECT id FROM farms WHERE name = $1 LIMIT 1', [finalFarmName]);
    const farmId = farmCheck.rows.length > 0
      ? farmCheck.rows[0].id
      : (await client.query('INSERT INTO farms (name) VALUES ($1) RETURNING id', [finalFarmName])).rows[0].id;

    const hashedPassword = await hash(password, 10);

    await client.query(`
      INSERT INTO users (email, password, is_superadmin, farm_id)
      VALUES ($1, $2, TRUE, $3)
      ON CONFLICT (email)
      DO UPDATE SET password = $2, is_superadmin = TRUE, farm_id = $3
    `, [email, hashedPassword, farmId]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'System initialized',
      email,
      farm_id: farmId,
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Setup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
