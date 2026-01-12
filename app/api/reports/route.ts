import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';
  const period = searchParams.get('period') || 'month';

  try {
    let result: any = { kpi: {}, charts: {} };
    const interval = period === 'year' ? '1 year' : period === 'all' ? '100 years' : '30 days';

    // --- 1. OVERVIEW REPORT ---
    if (type === 'overview') {
        const cropsCount = await sql`SELECT COUNT(*) FROM crops`;
        const animalsCount = await sql`SELECT COUNT(*) FROM livestock`;
        const salesTotal = await sql`SELECT SUM(total_amount) FROM sales`;
        
        const totalTasks = await sql`SELECT COUNT(*) FROM tasks`;
        const completedTasks = await sql`SELECT COUNT(*) FROM tasks WHERE status = 'completed'`;
        const completionRate = Number(totalTasks[0].count) > 0 
            ? Math.round((Number(completedTasks[0].count) / Number(totalTasks[0].count)) * 100) 
            : 0;

        const cropDist = await sql`SELECT crop_type as name, COUNT(*) as value FROM crops GROUP BY crop_type`;
        
        const salesTrend = await sql`
            SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
            FROM sales 
            WHERE sale_date >= NOW() - ${interval}::INTERVAL
            GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date 
            ORDER BY sale_date DESC LIMIT 7
        `;

        result.kpi = { 
            crops: Number(cropsCount[0].count), 
            animals: Number(animalsCount[0].count), 
            sales: Number(salesTotal[0].sum || 0), 
            completion_rate: completionRate 
        };
        result.charts = { cropDist, salesTrend };
    }

    // --- 2. SALES REPORT ---
    else if (type === 'sales') {
        const salesTotal = await sql`SELECT SUM(total_amount) FROM sales WHERE sale_date >= NOW() - ${interval}::INTERVAL`;
        const salesCount = await sql`SELECT COUNT(*) FROM sales WHERE sale_date >= NOW() - ${interval}::INTERVAL`;
        const avgSale = await sql`SELECT AVG(total_amount) FROM sales WHERE sale_date >= NOW() - ${interval}::INTERVAL`;
        
        const salesTrend = await sql`
            SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
            FROM sales 
            WHERE sale_date >= NOW() - ${interval}::INTERVAL
            GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date 
            ORDER BY sale_date 
        `;

        result.kpi = { 
            total_revenue: Number(salesTotal[0].sum || 0), 
            total_transactions: Number(salesCount[0].count), 
            avg_ticket: Number(avgSale[0].avg || 0) 
        };
        result.charts = { salesTrend };
    }

    // --- 3. INVENTORY REPORT ---
    else if (type === 'inventory') {
        const totalItems = await sql`SELECT COUNT(*) FROM inventory`;
        const lowStock = await sql`SELECT COUNT(*) FROM inventory WHERE quantity <= min_threshold`;
        const totalValue = await sql`SELECT SUM(quantity * unit_price) FROM inventory`;
        const stockLevels = await sql`SELECT item_name as name, quantity as value FROM inventory ORDER BY quantity DESC LIMIT 10`;

        result.kpi = {
            total_items: Number(totalItems[0].count),
            low_stock: Number(lowStock[0].count),
            valuation: Number(totalValue[0].sum || 0)
        };
        result.charts = { stockLevels };
    }

    // --- 4. TASKS REPORT ---
    else if (type === 'tasks') {
        const totalTasks = await sql`SELECT COUNT(*) FROM tasks`;
        const completed = await sql`SELECT COUNT(*) FROM tasks WHERE status = 'completed'`;
        const overdue = await sql`SELECT COUNT(*) FROM tasks WHERE status != 'completed' AND due_date < CURRENT_DATE`;
        
        const empPerformance = await sql`
            SELECT e.full_name as name, COUNT(ta.task_id) as value 
            FROM employees e 
            JOIN task_assignments ta ON e.id = ta.employee_id
            JOIN tasks t ON ta.task_id = t.id 
            WHERE t.status = 'completed' 
            GROUP BY e.full_name
        `;

        result.kpi = {
            total: Number(totalTasks[0].count),
            completed: Number(completed[0].count),
            overdue: Number(overdue[0].count),
            pending: Number(totalTasks[0].count) - Number(completed[0].count)
        };
        result.charts = { empPerformance };
    }

    // --- 5. CROP REPORT ---
    else if (type === 'crops') {
        const totalCrops = await sql`SELECT COUNT(*) FROM crops`;
        const harvested = await sql`SELECT COUNT(*) FROM crops WHERE status = 'harvested'`;
        const planted = await sql`SELECT COUNT(*) FROM crops WHERE status = 'planted'`;

        const yieldComparison = await sql`
            SELECT crop_type as name, SUM(estimated_yield_kg) as estimated, SUM(COALESCE(actual_yield_kg, 0)) as actual 
            FROM crops GROUP BY crop_type
        `;

        result.kpi = { 
            total: Number(totalCrops[0].count), 
            harvested: Number(harvested[0].count), 
            planted: Number(planted[0].count) 
        };
        result.charts = { yieldComparison };
    }

    // --- 6. LIVESTOCK REPORT (UPDATED) ---
    else if (type === 'livestock') {
        const total = await sql`SELECT COUNT(*) FROM livestock`;
        const sick = await sql`SELECT COUNT(*) FROM livestock WHERE health_status = 'Sick'`;
        const sold = await sql`SELECT COUNT(*) FROM livestock WHERE health_status = 'Sold'`;
        
        const speciesDist = await sql`SELECT species as name, COUNT(*) as value FROM livestock GROUP BY species`;
        const healthDist = await sql`SELECT health_status as name, COUNT(*) as value FROM livestock GROUP BY health_status`;
        
        result.kpi = { 
            total: Number(total[0].count),
            sick: Number(sick[0].count),
            sold: Number(sold[0].count),
            active: Number(total[0].count) - Number(sold[0].count)
        };
        result.charts = { speciesDist, healthDist };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
