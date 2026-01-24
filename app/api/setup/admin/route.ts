import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import pool from '@/lib/pg'; // ✅ Use shared pool

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create Default Farm if none exists
    // (This ensures the admin has a "home")
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

    // 3. Insert/Update Admin User linked to the Farm
    // Note: We use ON CONFLICT to reset password/farm if user exists
    await client.query(`
      INSERT INTO users (email, password, role, farm_id)
      VALUES ('admin@farm.com', $1, 'Admin', $2)
      ON CONFLICT (email) 
      DO UPDATE SET password = $1, role = 'Admin', farm_id = $2
    `, [hashedPassword, farm_id]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: "Admin reset! Login: admin@farm.com / 123",
      farm_id: farm_id
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
