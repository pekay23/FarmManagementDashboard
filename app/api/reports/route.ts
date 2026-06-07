import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; 
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ✅ FIX: Get both farm_id AND is_superadmin
async function getSessionInfo() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return {
    farm_id: (session.user as any).farm_id,
    is_superadmin: (session.user as any).is_superadmin
  };
}

export async function GET(request: Request) {
  // ✅ This API now uses pool.query directly
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';
  const period = searchParams.get('period') || 'month';
  
  try {
    const { farm_id, is_superadmin } = await getSessionInfo();
    const result: any = { kpi: {}, charts: {} };
    const interval = period === 'year' ? '1 year' : period === 'all' ? '100 years' : '30 days';

    const where = is_superadmin ? "1=1" : "farm_id = $1";
    const params = is_superadmin ? [] : [farm_id];
    const intervalParamIndex = is_superadmin ? '$1' : '$2'; 
    const intervalParams = is_superadmin ? [interval] : [farm_id, interval];

    // --- OVERVIEW REPORT ---
    if (type === 'overview') {
        const [crops, animals, sales, totalTasks, completedTasks, cropDist, salesTrend] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM crops WHERE ${where}`, params),
            pool.query(`SELECT COUNT(*) FROM livestock WHERE ${where}`, params),
            pool.query(`SELECT SUM(total_amount) FROM sales WHERE ${where}`, params),
            pool.query(`SELECT COUNT(*) FROM tasks WHERE ${where}`, params),
            pool.query(`SELECT COUNT(*) FROM tasks WHERE status = 'Completed' AND ${where}`, params),
            pool.query(`SELECT crop_type as name, COUNT(*) as value FROM crops WHERE ${where} GROUP BY crop_type`, params),
            pool.query(`
                SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
                FROM sales 
                WHERE sale_date >= NOW() - ${intervalParamIndex}::INTERVAL AND ${where}
                GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date ORDER BY sale_date DESC LIMIT 7
            `, intervalParams)
        ]);

        const total = Number(totalTasks.rows[0].count);
        const completed = Number(completedTasks.rows[0].count);
        
        result.kpi = { 
            crops: Number(crops.rows[0].count), 
            animals: Number(animals.rows[0].count), 
            sales: Number(sales.rows[0].sum || 0), 
            completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0 
        };
        result.charts = { cropDist: cropDist.rows, salesTrend: salesTrend.rows };
    }
    // ... (rest of your existing if/else blocks for other report types are fine, 
    // just ensure they use pool.query instead of client.query)

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}

