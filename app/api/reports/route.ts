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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';
  const period = searchParams.get('period') || 'month';
  const client = await pool.connect();
  
  try {
    const farm_id = await getFarmId(); // 🔒 Secure check
    let result: any = { kpi: {}, charts: {} };
    const interval = period === 'year' ? '1 year' : period === 'all' ? '100 years' : '30 days';

    // --- 1. OVERVIEW REPORT ---
    if (type === 'overview') {
        const [crops, animals, sales, totalTasks, completedTasks, cropDist, salesTrend] = await Promise.all([
            client.query('SELECT COUNT(*) FROM crops WHERE farm_id = $1', [farm_id]),
            client.query('SELECT COUNT(*) FROM livestock WHERE farm_id = $1', [farm_id]),
            client.query('SELECT SUM(total_amount) FROM sales WHERE farm_id = $1', [farm_id]),
            client.query('SELECT COUNT(*) FROM tasks WHERE farm_id = $1', [farm_id]),
            client.query("SELECT COUNT(*) FROM tasks WHERE status = 'Completed' AND farm_id = $1", [farm_id]),
            
            client.query('SELECT crop_type as name, COUNT(*) as value FROM crops WHERE farm_id = $1 GROUP BY crop_type', [farm_id]),
            
            client.query(`
                SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
                FROM sales 
                WHERE sale_date >= NOW() - $2::INTERVAL AND farm_id = $1
                GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date ORDER BY sale_date DESC LIMIT 7
            `, [farm_id, interval])
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
            client.query(`SELECT SUM(total_amount) as sum FROM sales WHERE sale_date >= NOW() - $2::INTERVAL AND farm_id = $1`, [farm_id, interval]),
            client.query(`SELECT COUNT(*) as count FROM sales WHERE sale_date >= NOW() - $2::INTERVAL AND farm_id = $1`, [farm_id, interval]),
            client.query(`SELECT AVG(total_amount) as avg FROM sales WHERE sale_date >= NOW() - $2::INTERVAL AND farm_id = $1`, [farm_id, interval]),
            
            client.query(`
                SELECT TO_CHAR(sale_date, 'Mon DD') as name, SUM(total_amount) as value 
                FROM sales WHERE sale_date >= NOW() - $2::INTERVAL AND farm_id = $1
                GROUP BY TO_CHAR(sale_date, 'Mon DD'), sale_date ORDER BY sale_date
            `, [farm_id, interval]),

            // Join with sale_items to get actual top items
            client.query(`
                SELECT si.item_name as name, SUM(si.quantity * si.price_at_sale) as value
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                WHERE s.sale_date >= NOW() - $2::INTERVAL AND s.farm_id = $1
                GROUP BY si.item_name
                ORDER BY value DESC LIMIT 5
            `, [farm_id, interval])
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
            client.query('SELECT COUNT(*) FROM inventory WHERE farm_id = $1', [farm_id]),
            client.query('SELECT COUNT(*) FROM inventory WHERE quantity <= min_threshold AND farm_id = $1', [farm_id]),
            client.query('SELECT SUM(quantity * unit_price) FROM inventory WHERE farm_id = $1', [farm_id]),
            
            client.query('SELECT item_name as name, quantity as value FROM inventory WHERE farm_id = $1 ORDER BY quantity DESC LIMIT 10', [farm_id]),
            client.query('SELECT category as name, SUM(quantity * unit_price) as value FROM inventory WHERE farm_id = $1 GROUP BY category', [farm_id])
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
            client.query('SELECT COUNT(*) FROM tasks WHERE farm_id = $1', [farm_id]),
            client.query("SELECT COUNT(*) FROM tasks WHERE status = 'Completed' AND farm_id = $1", [farm_id]),
            client.query("SELECT COUNT(*) FROM tasks WHERE status != 'Completed' AND due_date < CURRENT_DATE AND farm_id = $1", [farm_id]),
            
            // Performance by assignee (using task_assignments join)
            client.query(`
                SELECT e.full_name as name, COUNT(*) as value 
                FROM tasks t
                JOIN task_assignments ta ON t.id = ta.task_id
                JOIN employees e ON ta.employee_id = e.id
                WHERE t.status = 'Completed' AND t.farm_id = $1
                GROUP BY e.full_name
            `, [farm_id]),

            client.query("SELECT priority as name, COUNT(*) as value FROM tasks WHERE status = 'Pending' AND farm_id = $1 GROUP BY priority", [farm_id])
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
            client.query('SELECT COUNT(*) FROM crops WHERE farm_id = $1', [farm_id]),
            client.query("SELECT COUNT(*) FROM crops WHERE status = 'Harvested' AND farm_id = $1", [farm_id]),
            client.query("SELECT COUNT(*) FROM crops WHERE status = 'Planted' AND farm_id = $1", [farm_id]),
            
            client.query(`
                SELECT crop_type as name, SUM(estimated_yield_kg) as estimated, SUM(COALESCE(actual_yield_kg, 0)) as actual 
                FROM crops WHERE farm_id = $1 GROUP BY crop_type
            `, [farm_id]),
            
            client.query('SELECT crop_type as name, SUM(plot_size_acres) as value FROM crops WHERE farm_id = $1 GROUP BY crop_type', [farm_id])
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
            client.query('SELECT COUNT(*) FROM livestock WHERE farm_id = $1', [farm_id]),
            client.query("SELECT COUNT(*) FROM livestock WHERE health_status = 'Sick' AND farm_id = $1", [farm_id]),
            client.query("SELECT COUNT(*) FROM livestock WHERE health_status = 'Sold' AND farm_id = $1", [farm_id]),
            
            client.query('SELECT species as name, COUNT(*) as value FROM livestock WHERE farm_id = $1 GROUP BY species', [farm_id]),
            client.query('SELECT health_status as name, COUNT(*) as value FROM livestock WHERE farm_id = $1 GROUP BY health_status', [farm_id]),
            client.query('SELECT sex as name, COUNT(*) as value FROM livestock WHERE farm_id = $1 GROUP BY sex', [farm_id])
        ]);

        result.kpi = { 
            total: Number(total.rows[0].count), 
            sick: Number(sick.rows[0].count), 
            sold: Number(sold.rows[0].count), 
            active: Number(total.rows[0].count) - Number(sold.rows[0].count) 
        };
        result.charts = { speciesDist: species.rows, healthDist: health.rows, genderDist: gender.rows };
    }

    // --- 7. EXPENSES REPORT (New) ---
    else if (type === 'expenses') {
        const [total, count, avg, catDist, trend] = await Promise.all([
            client.query('SELECT SUM(amount) FROM expenses WHERE farm_id = $1', [farm_id]),
            client.query('SELECT COUNT(*) FROM expenses WHERE farm_id = $1', [farm_id]),
            client.query('SELECT AVG(amount) FROM expenses WHERE farm_id = $1', [farm_id]),
            client.query('SELECT category as name, SUM(amount) as value FROM expenses WHERE farm_id = $1 GROUP BY category', [farm_id]),
            client.query(`
                SELECT TO_CHAR(expense_date, 'Mon DD') as name, SUM(amount) as value 
                FROM expenses 
                WHERE expense_date >= NOW() - $2::INTERVAL AND farm_id = $1
                GROUP BY TO_CHAR(expense_date, 'Mon DD'), expense_date 
                ORDER BY expense_date
            `, [farm_id, interval])
        ]);

        result.kpi = {
            total_expenses: Number(total.rows[0].sum || 0),
            count: Number(count.rows[0].count),
            avg_expense: Number(avg.rows[0].avg || 0)
        };
        result.charts = { categoryDist: catDist.rows, expenseTrend: trend.rows };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  } finally {
    client.release();
  }
}
