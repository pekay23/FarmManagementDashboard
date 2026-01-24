import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import pool from '@/lib/pg'; // ✅ Use shared pool
import { authOptions } from "@/lib/auth"; 

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { newPassword } = await req.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const hashedPassword = await hash(newPassword, 10);
  const client = await pool.connect();

  try {
    // Update password for the logged-in user
    await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, session.user.email]);
    return NextResponse.json({ message: "Password updated successfully" });
  } catch (e) {
    console.error("Password update error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    client.release();
  }
}
