import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit, requirePermission } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
  };
}

export async function GET() {
  // ✅ OPTIMIZED
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();

    if (is_superadmin && !farm_id) {
        return NextResponse.json({});
    }

    if (!farm_id) throw new Error('Unauthorized');

    const result = await pool.query(
      'SELECT name as farm_name, logo, phone, email, address, receipt_footer, tax_rate, working_hours, show_contact_on_pdf FROM farms WHERE id = $1', 
      [farm_id]
    );
    return NextResponse.json(result.rows[0] || {});
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requirePermission('settings:write');
    const { farm_id } = session;
    
    // Only actual farm owners can update their settings
    if (!farm_id) throw new Error('Unauthorized');

    const body = await request.json();
    const { farm_name, logo, phone, email, address, receipt_footer, tax_rate, working_hours, show_contact_on_pdf } = body;

    const query = `
      UPDATE farms 
      SET name = $1,
          logo = $2,
          phone = $3,
          email = $4,
          address = $5,
          receipt_footer = $6,
          tax_rate = $7,
          working_hours = $8,
          show_contact_on_pdf = $9
      WHERE id = $10
      RETURNING name as farm_name, logo
    `;
    
    const result = await client.query(query, [
        farm_name, logo, phone, email, address, receipt_footer, tax_rate, 
        working_hours, 
        show_contact_on_pdf === undefined ? true : show_contact_on_pdf, 
        farm_id
    ]);
    
    await logAudit(session, 'settings.updated', 'farm', farm_id, { farm_name, email });
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Save settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
