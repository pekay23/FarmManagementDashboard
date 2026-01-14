import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { newPassword } = await req.json();
  const hashedPassword = await hash(newPassword, 10);

  const client = await pool.connect();
  try {
    await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, session.user.email]);
    return NextResponse.json({ message: "Password updated" });
  } catch (e) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    client.release();
  }
}
