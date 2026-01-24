import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getFarmId() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).farm_id) {
    throw new Error('Unauthorized');
  }
  return (session.user as any).farm_id;
}

export async function GET() {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); 
    // ✅ Fetch logo along with other settings
    const result = await client.query(
      'SELECT name as farm_name, logo, phone, email, address, receipt_footer, tax_rate FROM farms WHERE id = $1', 
      [farm_id]
    );
    return NextResponse.json(result.rows[0] || {});
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const farm_id = await getFarmId(); 
    const body = await request.json();
    const { farm_name, logo, phone, email, address, receipt_footer, tax_rate } = body;

    // ✅ Update logo and name
    const query = `
      UPDATE farms 
      SET name = $1,
          logo = $2,
          phone = $3,
          email = $4,
          address = $5,
          receipt_footer = $6,
          tax_rate = $7
      WHERE id = $8
      RETURNING name as farm_name, logo
    `;
    
    const result = await client.query(query, [farm_name, logo, phone, email, address, receipt_footer, tax_rate, farm_id]);
    
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
