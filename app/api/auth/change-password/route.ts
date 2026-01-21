import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { Pool } from 'pg';
import { authOptions } from "../[...nextauth]/route"; // Import your auth config

// 1. SSL for Neon
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true 
});

export async function POST(req: Request) {
  // 2. Pass authOptions to getServerSession to fix the "Not authenticated" error
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { newPassword } = await req.json();

  // 3. Basic Validation
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const hashedPassword = await hash(newPassword, 10);
  const client = await pool.connect();

  try {
    await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, session.user.email]);
    return NextResponse.json({ message: "Password updated successfully" });
  } catch (e) {
    console.error("Password update error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    client.release();
  }
}
