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
    const farm_id = await getFarmId(); // 🔒 Secure check

    // 1. Run all independent queries in PARALLEL for speed
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
      // KPIs - Scoped to farm_id
      client.query('SELECT COUNT(*) FROM crops WHERE farm_id = $1', [farm_id]),
      client.query('SELECT COUNT(*) FROM livestock WHERE farm_id = $1', [farm_id]),
      client.query('SELECT SUM(total_amount) FROM sales WHERE farm_id = $1', [farm_id]),
      client.query("SELECT COUNT(*) FROM tasks WHERE status = 'Pending' AND farm_id = $1", [farm_id]),
      
      // Alerts: Low Stock - Scoped
      client.query('SELECT item_name as name, quantity, unit FROM inventory WHERE quantity <= min_threshold AND farm_id = $1 LIMIT 3', [farm_id]),
      
      // Alerts: Overdue Tasks - Scoped
      client.query("SELECT title, due_date FROM tasks WHERE status != 'Completed' AND due_date < CURRENT_DATE AND farm_id = $1 LIMIT 3", [farm_id]),
      
      // Upcoming Harvests (Next 14 days) - Scoped
      client.query(`
        SELECT crop_type, plot_number, expected_harvest_date 
        FROM crops 
        WHERE status = 'Growing' 
        AND expected_harvest_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        AND farm_id = $1
        ORDER BY expected_harvest_date ASC
        LIMIT 5
      `, [farm_id]),
      
      // Sales Trend (Last 7 Days) - Scoped
      client.query(`
        SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
        FROM sales 
        WHERE sale_date >= NOW() - INTERVAL '7 days' AND farm_id = $1
        GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date 
        ORDER BY sale_date
      `, [farm_id]),

      // Recent Activity: Sales - Scoped
      client.query("SELECT 'sale' as type, buyer_name as customer, sale_date as date, total_amount as amount FROM sales WHERE farm_id = $1 ORDER BY sale_date DESC LIMIT 5", [farm_id]),
      
      // Recent Activity: Tasks - Scoped
      client.query("SELECT 'task' as type, title, updated_at as date, status FROM tasks WHERE status = 'Completed' AND farm_id = $1 ORDER BY updated_at DESC LIMIT 5", [farm_id])
    ]);

    // 2. Format the Activity Feed (Combine Sales & Tasks)
    const recentSales = recentSalesRes.rows.map(s => ({
      type: 'sale',
      title: `Sale: ${s.customer || 'Unknown'}`,
      date: s.date,
      detail: `GH₵ ${s.amount}`
    }));

    const recentTasks = recentTasksRes.rows.map(t => ({
      type: 'task',
      title: `Task: ${t.title}`,
      date: t.date, // mapped from updated_at
      detail: t.status
    }));

    // Sort combined activity by date
    const activityFeed = [...recentSales, ...recentTasks]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // 3. Return JSON
    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
