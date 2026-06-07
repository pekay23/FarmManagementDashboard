import { NextResponse } from 'next/server';
import pool from '@/lib/pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedFarmId = searchParams.get('farm_id'); 

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session) throw new Error('Unauthorized');

    const isSuperAdmin = user.is_superadmin;
    const userFarmId = user.farm_id;

    let targetFarmId = userFarmId;
    if (isSuperAdmin && selectedFarmId && selectedFarmId !== 'all') {
        targetFarmId = selectedFarmId;
    }

    const isAggregateView = isSuperAdmin && (!selectedFarmId || selectedFarmId === 'all');
    const where = isAggregateView ? "1=1" : "farm_id = $1";
    const params = isAggregateView ? [] : [targetFarmId];
    
    const intervalParamIndex = isAggregateView ? '$1' : '$2';
    const interval = '7 days';
    const intervalParams = isAggregateView ? [interval] : [targetFarmId, interval];

    const allFarmsRes = isSuperAdmin ? await pool.query('SELECT id, name FROM farms ORDER BY name') : { rows: [] };

    const [
      cropsCountRes,
      animalsCountRes,
      salesTotalRes,
      pendingTasksRes,
      lowStockRes,
      overdueTasksRes,
      upcomingHarvestsRes,
      salesTrendRes,
      recentSalesRes,
      recentTasksRes
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM crops WHERE ${where}`, params),
      pool.query(`SELECT COUNT(*) FROM livestock WHERE ${where}`, params),
      pool.query(`SELECT SUM(total_amount) FROM sales WHERE ${where}`, params),
      pool.query(`SELECT COUNT(*) FROM tasks WHERE status = 'Pending' AND ${where}`, params),
      pool.query(`SELECT item_name as name, quantity, unit FROM inventory WHERE quantity <= min_threshold AND ${where} LIMIT 3`, params),
      pool.query(`SELECT title, due_date FROM tasks WHERE status != 'Completed' AND due_date < CURRENT_DATE AND ${where} LIMIT 3`, params),
      pool.query(`
        SELECT crop_type, plot_number, expected_harvest_date 
        FROM crops 
        WHERE status = 'Growing' AND expected_harvest_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days' AND ${where}
        ORDER BY expected_harvest_date ASC LIMIT 5
      `, params),
      pool.query(`
        SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
        FROM sales 
        WHERE sale_date >= NOW() - ${intervalParamIndex}::INTERVAL AND ${where}
        GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date ORDER BY sale_date
      `, intervalParams),
      pool.query(`SELECT 'sale' as type, buyer_name as customer, sale_date as date, total_amount as amount FROM sales WHERE ${where} ORDER BY sale_date DESC LIMIT 5`, params),
      
      // ✅ FIX: Changed updated_at to created_at
      pool.query(`SELECT 'task' as type, title, created_at as date, status FROM tasks WHERE status = 'Completed' AND ${where} ORDER BY created_at DESC LIMIT 5`, params)
    ]);

    const recentSales = recentSalesRes.rows.map((s: any) => ({ type: 'sale', title: `Sale: ${s.customer || 'Unknown'}`, date: s.date, detail: `GH₵ ${s.amount}` }));
    const recentTasks = recentTasksRes.rows.map((t: any) => ({ type: 'task', title: `Task: ${t.title}`, date: t.date, detail: t.status }));
    const activityFeed = [...recentSales, ...recentTasks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return NextResponse.json({
      allFarms: allFarmsRes.rows,
      kpi: {
        crops: Number(cropsCountRes.rows[0].count),
        animals: Number(animalsCountRes.rows[0].count),
        sales: Number(salesTotalRes.rows[0].sum || 0),
        tasks: Number(pendingTasksRes.rows[0].count)
      },
      alerts: {
        lowStock: lowStockRes.rows,
        overdue: overdueTasksRes.rows,
        harvests: upcomingHarvestsRes.rows
      },
      charts: {
        salesTrend: salesTrendRes.rows
      },
      activity: activityFeed
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
