import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';

// Direct connection to Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

export async function GET() {
  const client = await pool.connect();
  try {
    // 1. Create the Users table if it's missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    // 2. Encrypt the new password
    // You can change 'admin123' here to whatever you want
    const hashedPassword = await hash('123', 10);

    // 3. Insert or Update the Admin user
    await client.query(`
      INSERT INTO users (name, email, password)
      VALUES ('Farm Admin', 'admin@farm.com', $1)
      ON CONFLICT (email) 
      DO UPDATE SET password = $1;
    `, [hashedPassword]);

    return NextResponse.json({ 
      success: true, 
      message: "Admin account reset! Login with: admin@farm.com / admin123" 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
