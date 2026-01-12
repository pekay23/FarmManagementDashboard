import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. KPI Counts
    const cropsCount = await sql`SELECT COUNT(*) FROM crops`;
    const animalsCount = await sql`SELECT COUNT(*) FROM livestock`;
    const salesTotal = await sql`SELECT SUM(total_amount) FROM sales`;
    const pendingTasks = await sql`SELECT COUNT(*) FROM tasks WHERE status = 'pending'`;

    // 2. Urgent Alerts (Low Stock + Overdue Tasks)
    const lowStockItems = await sql`SELECT item_name, quantity, unit FROM inventory WHERE quantity <= min_threshold LIMIT 3`;
    const overdueTasks = await sql`SELECT title, due_date FROM tasks WHERE status != 'completed' AND due_date < CURRENT_DATE LIMIT 3`;

    // 3. Upcoming Harvests (Next 14 days)
    const upcomingHarvests = await sql`
        SELECT crop_type, plot_number, expected_harvest_date 
        FROM crops 
        WHERE status = 'growing' 
        AND expected_harvest_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        ORDER BY expected_harvest_date ASC
        LIMIT 5
    `;

    // 4. Sales Trend (Last 7 Days)
    const salesTrend = await sql`
        SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
        FROM sales 
        WHERE sale_date >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date 
        ORDER BY sale_date
    `;

    // 5. Recent Activity Feed (Combined Sales & Tasks)
    // We combine them into a uniform structure: { type, title, date, detail }
    const recentSales = await sql`
        SELECT 'sale' as type, 'Sale: ' || buyer_name as title, sale_date as date, 'GH₵ ' || total_amount as detail 
        FROM sales ORDER BY sale_date DESC LIMIT 5
    `;
    const recentTasks = await sql`
        SELECT 'task' as type, 'Task: ' || title as title, created_at as date, status as detail 
        FROM tasks WHERE status = 'completed' ORDER BY created_at DESC LIMIT 5
    `;

    // Merge and sort activity
    const activityFeed = [...recentSales, ...recentTasks]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); // Keep top 5 most recent

    return NextResponse.json({
        kpi: {
            crops: Number(cropsCount[0].count),
            animals: Number(animalsCount[0].count),
            sales: Number(salesTotal[0].sum || 0),
            tasks: Number(pendingTasks[0].count)
        },
        alerts: {
            lowStock: lowStockItems,
            overdue: overdueTasks,
            harvests: upcomingHarvests
        },
        charts: { salesTrend },
        activity: activityFeed
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
