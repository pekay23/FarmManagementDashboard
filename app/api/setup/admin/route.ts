import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import pool from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  
  try {
    // 🔒 SAFETY CHECK: Don't run if a Super Admin already exists
    const check = await client.query("SELECT id FROM users WHERE is_superadmin = TRUE LIMIT 1");
    if (check.rows.length > 0) {
        return NextResponse.json({ error: "System already initialized. Use the script to create new admins." }, { status: 403 });
    }

    await client.query('BEGIN');

    // 1. Create Default Farm
    let farm_id;
    const farmCheck = await client.query("SELECT id FROM farms WHERE name = 'Default Farm' LIMIT 1");
    
    if (farmCheck.rows.length > 0) {
        farm_id = farmCheck.rows[0].id;
    } else {
        const newFarm = await client.query("INSERT INTO farms (name) VALUES ('Default Farm') RETURNING id");
        farm_id = newFarm.rows[0].id;
    }

    // 2. Encrypt Password
    const hashedPassword = await hash('123', 10);

    // 3. Create Super Admin
    // Using is_superadmin = TRUE instead of role = 'Admin'
    await client.query(`
      INSERT INTO users (email, password, is_superadmin, farm_id)
      VALUES ('admin@farm.com', $1, TRUE, $2)
      ON CONFLICT (email) 
      DO UPDATE SET password = $1, is_superadmin = TRUE, farm_id = $2
    `, [hashedPassword, farm_id]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: "System initialized! Login: admin@farm.com / 123",
      farm_id: farm_id
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
