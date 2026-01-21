import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Use the Server DB connection

// Force dynamic so it doesn't cache old data
export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  
  try {
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
      // KPIs
      client.query('SELECT COUNT(*) FROM crops'),
      client.query('SELECT COUNT(*) FROM livestock'),
      client.query('SELECT SUM(amount) FROM sales'),
      client.query("SELECT COUNT(*) FROM tasks WHERE status = 'Pending'"),
      
      // Alerts: Low Stock (using standard SQL)
      client.query('SELECT name, quantity, unit FROM inventory WHERE quantity <= low_stock_threshold LIMIT 3'),
      
      // Alerts: Overdue Tasks
      client.query("SELECT title, due_date FROM tasks WHERE status != 'Completed' AND due_date < CURRENT_DATE LIMIT 3"),
      
      // Upcoming Harvests (Next 14 days)
      client.query(`
        SELECT crop_type, plot_number, expected_harvest_date 
        FROM crops 
        WHERE status = 'Growing' 
        AND expected_harvest_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        ORDER BY expected_harvest_date ASC
        LIMIT 5
      `),
      
      // Sales Trend (Last 7 Days)
      client.query(`
        SELECT TO_CHAR(date, 'Mon DD') as name, SUM(amount) as value 
        FROM sales 
        WHERE date >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR(date, 'Mon DD'), date 
        ORDER BY date
      `),

      // Recent Activity: Sales
      client.query("SELECT 'sale' as type, customer, date, amount FROM sales ORDER BY date DESC LIMIT 5"),
      
      // Recent Activity: Tasks
      client.query("SELECT 'task' as type, title, updated_at as date, status FROM tasks WHERE status = 'Completed' ORDER BY updated_at DESC LIMIT 5")
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

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  } finally {
    client.release();
  }
}
