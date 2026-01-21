import { NextResponse } from 'next/server';
import pool from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    // Check if table exists, if not create it (Auto-migration)
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category TEXT,
        expense_date TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const result = await client.query('SELECT * FROM expenses ORDER BY expense_date DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { title, amount, category, date, notes } = body;

    const query = `
      INSERT INTO expenses (title, amount, category, expense_date, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await client.query(query, [title, amount, category, date, notes]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  } finally {
    client.release();
  }
}
