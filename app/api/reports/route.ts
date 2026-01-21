import { NextResponse } from 'next/server';
import pool from '@/lib/pg'; // Server DB connection

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';
  const period = searchParams.get('period') || 'month';

  const client = await pool.connect();
  
  try {
    let result: any = { kpi: {}, charts: {} };
    const interval = period === 'year' ? '1 year' : period === 'all' ? '100 years' : '30 days';

    // --- 1. OVERVIEW REPORT ---
    if (type === 'overview') {
        const [crops, animals, sales, totalTasks, completedTasks, cropDist, salesTrend] = await Promise.all([
            client.query('SELECT COUNT(*) FROM crops'),
            client.query('SELECT COUNT(*) FROM livestock'),
            client.query('SELECT SUM(amount) FROM sales'),
            client.query('SELECT COUNT(*) FROM tasks'),
            client.query("SELECT COUNT(*) FROM tasks WHERE status = 'Completed'"),
            client.query('SELECT crop_type as name, COUNT(*) as value FROM crops GROUP BY crop_type'),
            client.query(`
                SELECT TO_CHAR(date, 'Mon DD') as name, SUM(amount) as value 
                FROM sales WHERE date >= NOW() - $1::INTERVAL
                GROUP BY TO_CHAR(date, 'Mon DD'), date ORDER BY date DESC LIMIT 7
            `, [interval])
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

    // --- 2. SALES REPORT ---
    else if (type === 'sales') {
        const [total, count, avg, trend, topItems] = await Promise.all([
            client.query(`SELECT SUM(amount) FROM sales WHERE date >= NOW() - $1::INTERVAL`, [interval]),
            client.query(`SELECT COUNT(*) FROM sales WHERE date >= NOW() - $1::INTERVAL`, [interval]),
            client.query(`SELECT AVG(amount) FROM sales WHERE date >= NOW() - $1::INTERVAL`, [interval]),
            client.query(`
                SELECT TO_CHAR(date, 'Mon DD') as name, SUM(amount) as value 
                FROM sales WHERE date >= NOW() - $1::INTERVAL
                GROUP BY TO_CHAR(date, 'Mon DD'), date ORDER BY date
            `, [interval]),
            // Simplified: Assuming 'item' is a string column in 'sales' table for now
            client.query(`
                SELECT item as name, SUM(amount) as value
                FROM sales
                WHERE date >= NOW() - $1::INTERVAL
                GROUP BY item
                ORDER BY value DESC LIMIT 5
            `, [interval])
        ]);

        result.kpi = { 
            total_revenue: Number(total.rows[0].sum || 0), 
            total_transactions: Number(count.rows[0].count), 
            avg_ticket: Number(avg.rows[0].avg || 0) 
        };
        result.charts = { salesTrend: trend.rows, topItems: topItems.rows };
    }

    // --- 3. INVENTORY REPORT ---
    else if (type === 'inventory') {
        const [total, low, value, levels, cats] = await Promise.all([
            client.query('SELECT COUNT(*) FROM inventory'),
            client.query('SELECT COUNT(*) FROM inventory WHERE quantity <= low_stock_threshold'), // Note: column name check
            client.query('SELECT SUM(quantity * unit_price) FROM inventory'),
            client.query('SELECT item_name as name, quantity as value FROM inventory ORDER BY quantity DESC LIMIT 10'),
            client.query('SELECT category as name, SUM(quantity * unit_price) as value FROM inventory GROUP BY category')
        ]);

        result.kpi = {
            total_items: Number(total.rows[0].count),
            low_stock: Number(low.rows[0].count),
            valuation: Number(value.rows[0].sum || 0)
        };
        result.charts = { stockLevels: levels.rows, categoryValue: cats.rows };
    }

    // --- 4. TASKS REPORT ---
    else if (type === 'tasks') {
        const [total, completed, overdue, performance, priority] = await Promise.all([
            client.query('SELECT COUNT(*) FROM tasks'),
            client.query("SELECT COUNT(*) FROM tasks WHERE status = 'Completed'"),
            client.query("SELECT COUNT(*) FROM tasks WHERE status != 'Completed' AND due_date < CURRENT_DATE"),
            // Simplified Performance Query (assuming assigned_to is a name)
            client.query(`
                SELECT assigned_to as name, COUNT(*) as value 
                FROM tasks 
                WHERE status = 'Completed' AND assigned_to IS NOT NULL
                GROUP BY assigned_to
            `),
            client.query("SELECT priority as name, COUNT(*) as value FROM tasks WHERE status = 'Pending' GROUP BY priority")
        ]);

        result.kpi = {
            total: Number(total.rows[0].count),
            completed: Number(completed.rows[0].count),
            overdue: Number(overdue.rows[0].count),
            pending: Number(total.rows[0].count) - Number(completed.rows[0].count)
        };
        result.charts = { empPerformance: performance.rows, priorityDist: priority.rows };
    }

    // --- 5. CROP REPORT ---
    else if (type === 'crops') {
        const [total, harvested, planted, yieldComp, land] = await Promise.all([
            client.query('SELECT COUNT(*) FROM crops'),
            client.query("SELECT COUNT(*) FROM crops WHERE status = 'Harvested'"),
            client.query("SELECT COUNT(*) FROM crops WHERE status = 'Planted'"),
            client.query(`
                SELECT crop_type as name, SUM(estimated_yield_kg) as estimated, SUM(COALESCE(actual_yield_kg, 0)) as actual 
                FROM crops GROUP BY crop_type
            `),
            client.query('SELECT crop_type as name, SUM(plot_size_acres) as value FROM crops GROUP BY crop_type')
        ]);

        result.kpi = { 
            total: Number(total.rows[0].count), 
            harvested: Number(harvested.rows[0].count), 
            planted: Number(planted.rows[0].count) 
        };
        result.charts = { yieldComparison: yieldComp.rows, landUsage: land.rows };
    }

    // --- 6. LIVESTOCK REPORT ---
    else if (type === 'livestock') {
        const [total, sick, sold, species, health, gender] = await Promise.all([
            client.query('SELECT COUNT(*) FROM livestock'),
            client.query("SELECT COUNT(*) FROM livestock WHERE health_status = 'Sick'"),
            client.query("SELECT COUNT(*) FROM livestock WHERE health_status = 'Sold'"),
            client.query('SELECT species as name, COUNT(*) as value FROM livestock GROUP BY species'),
            client.query('SELECT health_status as name, COUNT(*) as value FROM livestock GROUP BY health_status'),
            client.query('SELECT sex as name, COUNT(*) as value FROM livestock GROUP BY sex')
        ]);

        result.kpi = { 
            total: Number(total.rows[0].count),
            sick: Number(sick.rows[0].count),
            sold: Number(sold.rows[0].count),
            active: Number(total.rows[0].count) - Number(sold.rows[0].count)
        };
        result.charts = { speciesDist: species.rows, healthDist: health.rows, genderDist: gender.rows };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
