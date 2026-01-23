'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Sprout, PawPrint, DollarSign, CheckCircle, FileDown, Filter, 
  ChevronDown, Layers, AlertCircle, Clock, Package, AlertTriangle, TrendingUp, HeartPulse, TrendingDown 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils'; 
import { db } from '@/lib/db'; // Local DB
import { toast } from 'sonner';

// Brand Colors: Primary Teal, plus supporting colors
const COLORS = ['#14b8a6', '#f59e0b', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('overview'); 
  const [period, setPeriod] = useState('month'); 

  useEffect(() => {
    generateLocalReport();
  }, [reportType, period]);

  // --- LOCAL ANALYTICS ENGINE ---
  async function generateLocalReport() {
    setLoading(true);
    try {
      let result: any = { kpi: {}, charts: {} };
      const now = new Date();
      
      // Calculate Date Range
      let startDate = new Date(0); // Default all time
      if (period === 'month') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
      } else if (period === 'year') {
        startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Helper to exclude deleted items
      const notDeleted = (item: any) => item.syncStatus !== 'deleted';

      // --- 1. OVERVIEW ---
      if (reportType === 'overview') {
        const [crops, animals, sales, tasks, expenses] = await Promise.all([
            db.crops.filter(notDeleted).toArray(),
            db.livestock.filter(notDeleted).toArray(),
            db.sales.where('date').above(startDate.toISOString()).filter(notDeleted).toArray(),
            db.tasks.filter(notDeleted).toArray(),
            db.expenses.where('date').above(startDate.toISOString()).filter(notDeleted).toArray()
        ]);

        const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
        const totalExpense = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;
        const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        // Crop Distribution Chart
        const cropDistMap: Record<string, number> = {};
        crops.forEach(c => { cropDistMap[c.crop_type] = (cropDistMap[c.crop_type] || 0) + 1; });
        const cropDist = Object.keys(cropDistMap).map(k => ({ name: k, value: cropDistMap[k] }));

        // Sales Trend (Group by Day)
        const salesMap: Record<string, number> = {};
        sales.forEach(s => {
            const dateStr = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            salesMap[dateStr] = (salesMap[dateStr] || 0) + Number(s.amount);
        });
        const salesTrend = Object.keys(salesMap).map(k => ({ name: k, value: salesMap[k] })).slice(-7);

        result.kpi = { 
            net_profit: totalRevenue - totalExpense,
            sales: totalRevenue, 
            expenses: totalExpense, 
            completion_rate: completionRate 
        };
        result.charts = { cropDist, salesTrend };
      }

      // --- 2. SALES ---
      else if (reportType === 'sales') {
        const sales = await db.sales.where('date').above(startDate.toISOString()).filter(notDeleted).toArray();
        
        const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
        const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

        // Sales Trend
        const salesMap: Record<string, number> = {};
        sales.forEach(s => {
            const d = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            salesMap[d] = (salesMap[d] || 0) + Number(s.amount);
        });
        const salesTrend = Object.keys(salesMap).map(k => ({ name: k, value: salesMap[k] }));

        // Top Items (Proxy via Customer Name)
        const customerMap: Record<string, number> = {};
        sales.forEach(s => {
            const name = s.customer || 'Unknown';
            customerMap[name] = (customerMap[name] || 0) + Number(s.amount);
        });
        const topItems = Object.keys(customerMap)
            .map(k => ({ name: k, value: customerMap[k] }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 5);

        result.kpi = { total_revenue: totalRevenue, total_transactions: sales.length, avg_ticket: avgTicket };
        result.charts = { salesTrend, topItems };
      }

      // --- 3. EXPENSES (NEW) ---
      else if (reportType === 'expenses') {
        const expenses = await db.expenses.where('date').above(startDate.toISOString()).filter(notDeleted).toArray();
        const totalExpense = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const avgExpense = expenses.length > 0 ? totalExpense / expenses.length : 0;

        // Category Breakdown
        const catMap: Record<string, number> = {};
        expenses.forEach(e => {
            const cat = e.category || 'Other';
            catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
        });
        const categoryDist = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));

        // Daily Trend
        const expMap: Record<string, number> = {};
        expenses.forEach(e => {
            const d = new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            expMap[d] = (expMap[d] || 0) + Number(e.amount);
        });
        const expenseTrend = Object.keys(expMap).map(k => ({ name: k, value: expMap[k] }));

        result.kpi = { 
            total_expenses: totalExpense, 
            count: expenses.length, 
            avg_expense: avgExpense 
        };
        result.charts = { categoryDist, expenseTrend };
      }

      // --- 4. INVENTORY ---
      else if (reportType === 'inventory') {
        const items = await db.inventory.filter(notDeleted).toArray();
        const lowStock = items.filter(i => i.quantity <= i.lowStockThreshold).length;
        const valuation = items.reduce((acc, i) => acc + (i.quantity * (i.unitPrice || 0)), 0);

        // Value by Category
        const catMap: Record<string, number> = {};
        items.forEach(i => {
            const val = i.quantity * (i.unitPrice || 0);
            catMap[i.category] = (catMap[i.category] || 0) + val;
        });
        const categoryValue = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));

        // Stock Levels
        const stockLevels = [...items]
            .sort((a,b) => b.quantity - a.quantity)
            .slice(0, 10)
            .map(i => ({ name: i.name, value: i.quantity }));

        result.kpi = { total_items: items.length, low_stock: lowStock, valuation };
        result.charts = { stockLevels, categoryValue };
      }

      // --- 5. TASKS ---
      else if (reportType === 'tasks') {
        const tasks = await db.tasks.filter(notDeleted).toArray();
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const overdue = tasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate || '').getTime() < new Date().getTime()).length;
        
        const priorityMap: Record<string, number> = {};
        tasks.filter(t => t.status === 'Pending').forEach(t => {
            const p = t.priority || 'Medium';
            priorityMap[p] = (priorityMap[p] || 0) + 1;
        });
        const priorityDist = Object.keys(priorityMap).map(k => ({ name: k, value: priorityMap[k] }));

        result.kpi = { total: tasks.length, completed, overdue, pending: tasks.length - completed };
        result.charts = { priorityDist, empPerformance: [] };
      }

      // --- 6. CROPS ---
      else if (reportType === 'crops') {
        const crops = await db.crops.filter(notDeleted).toArray();
        const harvested = crops.filter(c => c.status === 'Harvested').length;
        const planted = crops.filter(c => c.status === 'Planted' || c.status === 'Growing').length;

        // Yield Comp
        const yieldMap: Record<string, {est: number, act: number}> = {};
        crops.forEach(c => {
            if(!yieldMap[c.crop_type]) yieldMap[c.crop_type] = {est: 0, act: 0};
            yieldMap[c.crop_type].est += c.estimated_yield_kg || 0;
            yieldMap[c.crop_type].act += c.actual_yield_kg || 0;
        });
        const yieldComparison = Object.keys(yieldMap).map(k => ({ 
            name: k, 
            estimated: yieldMap[k].est, 
            actual: yieldMap[k].act 
        }));

        // Land Usage
        const landMap: Record<string, number> = {};
        crops.forEach(c => { landMap[c.crop_type] = (landMap[c.crop_type] || 0) + (c.plot_size_acres || 0); });
        const landUsage = Object.keys(landMap).map(k => ({ name: k, value: landMap[k] }));

        result.kpi = { total: crops.length, harvested, planted };
        result.charts = { yieldComparison, landUsage };
      }

      // --- 7. LIVESTOCK ---
      else if (reportType === 'livestock') {
        const animals = await db.livestock.filter(notDeleted).toArray();
        const sick = animals.filter(a => a.health_status === 'Sick').length;
        const sold = animals.filter(a => a.health_status === 'Sold').length;
        
        // FIXED: Safe Key Access Logic
        const getDist = (field: string) => {
            const map: Record<string, number> = {};
            animals.forEach((a: any) => { 
                const val = a[field];
                // Force string key safely
                const key = val !== undefined && val !== null ? String(val) : 'Unknown';
                map[key] = (map[key] || 0) + 1; 
            });
            return Object.keys(map).map(k => ({ name: k, value: map[k] }));
        };

        result.kpi = { total: animals.length, sick, sold, active: animals.length - sold };
        result.charts = { 
            speciesDist: getDist('species'), 
            healthDist: getDist('health_status'), 
            genderDist: getDist('sex') 
        };
      }

      setData(result);
    } catch (e) { 
        console.error("Report gen error", e); 
    } finally { 
        setLoading(false); 
    }
  }

  const handleTypeChange = (e: any) => { setReportType(e.target.value); setData(null); };
  const handlePeriodChange = (e: any) => { setPeriod(e.target.value); setData(null); };

  async function generatePDF() {
    if (!data) return;
    const doc = new jsPDF();
    const primaryEmerald: [number, number, number] = [6, 78, 59];
    
    // 1. Executive Header
    doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    if (logoBase64) {
      const svgString = atob(logoBase64.split(',')[1]);
      await addSvgToPdf(doc, svgString, 15, 5, 25, 25);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`${reportType.toUpperCase()} PERFORMANCE REPORT`, 50, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()} | Period: ${period.toUpperCase()}`, 50, 28);

    // 2. Clear KPI Table
    const kpiRows = Object.entries(data.kpi).map(([key, val]: any) => [
        key.replace(/_/g, ' ').toUpperCase(), 
        typeof val === 'number' ? val.toLocaleString() : val
    ]);

    autoTable(doc, { 
        startY: 50, 
        head: [['PERFORMANCE METRIC', 'VALUE']], 
        body: kpiRows,
        headStyles: { fillColor: primaryEmerald, fontStyle: 'bold' },
        styles: { cellPadding: 4, fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 255, 250] } 
    });

    // 3. Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} - Hughes Farms Proprietary Data`, 105, 290, { align: "center" });
    }

    doc.save(`HughesFarm_${reportType}_${Date.now()}.pdf`);
    toast.success("Professional report generated!");
  }

  // ✅ FIX: WHITE SCREEN PROTECTION
  if (loading || !data) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-gray-400">
              <Package className="w-12 h-12 animate-bounce mb-4 opacity-20" />
              <p>Calculating your farm report...</p>
          </div>
      );
  }

  // --- DYNAMIC CONTENT RENDERERS ---
  const renderKPIs = () => {
    if (!data?.kpi) return null;
    switch (reportType) {
        case 'overview':
            return (
                <>
                    <KpiCard title="Net Profit" value={`GH₵ ${data.kpi.net_profit.toLocaleString()}`} sub="Sales - Expenses" icon={DollarSign} color={data.kpi.net_profit >= 0 ? "green" : "red"} />
                    <KpiCard title="Total Sales" value={`GH₵ ${data.kpi.sales.toLocaleString()}`} sub="Revenue" icon={TrendingUp} color="blue" />
                    <KpiCard title="Total Expenses" value={`GH₵ ${data.kpi.expenses.toLocaleString()}`} sub="Costs" icon={TrendingDown} color="orange" />
                    <KpiCard title="Task Completion" value={`${data.kpi.completion_rate || 0}%`} sub="Efficiency" icon={CheckCircle} color="teal" />
                </>
            );
        case 'expenses':
            return (
                <>
                    <KpiCard title="Total Expenses" value={`GH₵ ${data.kpi.total_expenses.toLocaleString()}`} icon={TrendingDown} color="red" />
                    <KpiCard title="Transactions" value={data.kpi.count} icon={FileDown} color="blue" />
                    <KpiCard title="Avg. Expense" value={`GH₵ ${Math.round(data.kpi.avg_expense).toLocaleString()}`} icon={DollarSign} color="orange" />
                </>
            );
        case 'sales':
            return (
                <>
                    <KpiCard title="Total Revenue" value={`GH₵ ${(data.kpi.total_revenue || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
                    <KpiCard title="Transactions" value={data.kpi.total_transactions || 0} icon={FileDown} color="blue" />
                    <KpiCard title="Avg. Ticket" value={`GH₵ ${Math.round(data.kpi.avg_ticket || 0).toLocaleString()}`} icon={TrendingUp} color="green" />
                </>
            );
        case 'inventory':
            return (
                <>
                    <KpiCard title="Inventory Valuation" value={`GH₵ ${(data.kpi.valuation || 0).toLocaleString()}`} icon={DollarSign} color="green" />
                    <KpiCard title="Low Stock Items" value={data.kpi.low_stock || 0} sub="Restock needed" icon={AlertTriangle} color="red" />
                    <KpiCard title="Total Items" value={data.kpi.total_items || 0} icon={Package} color="blue" />
                </>
            );
        case 'tasks':
            return (
                <>
                    <KpiCard title="Total Tasks" value={data.kpi.total || 0} icon={Layers} color="blue" />
                    <KpiCard title="Completed" value={data.kpi.completed || 0} icon={CheckCircle} color="green" />
                    <KpiCard title="Overdue" value={data.kpi.overdue || 0} sub="Urgent" icon={AlertCircle} color="red" />
                    <KpiCard title="Pending" value={data.kpi.pending || 0} icon={Clock} color="orange" />
                </>
            );
        case 'crops':
            return (
                <>
                    <KpiCard title="Total Planted" value={data.kpi.total || 0} icon={Sprout} color="green" />
                    <KpiCard title="Harvested" value={data.kpi.harvested || 0} icon={CheckCircle} color="orange" />
                    <KpiCard title="Active Fields" value={data.kpi.planted || 0} icon={Layers} color="blue" />
                </>
            );
        case 'livestock':
            return (
                <>
                    <KpiCard title="Total Animals" value={data.kpi.total || 0} icon={Layers} color="blue" />
                    <KpiCard title="Active Animals" value={data.kpi.active || 0} icon={PawPrint} color="green" />
                    <KpiCard title="Sick / Injured" value={data.kpi.sick || 0} sub="Requires Attention" icon={HeartPulse} color="red" />
                    <KpiCard title="Sold / Gone" value={data.kpi.sold || 0} icon={DollarSign} color="orange" />
                </>
            );
        default: return null;
    }
  };

  const renderCharts = () => {
    if (!data?.charts) return null;
    const commonGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} />;
    
    switch (reportType) {
        case 'overview':
            return (
                <>
                    <ChartCard title="Sales Trend (Last 7 Days)">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.charts.salesTrend || []}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                {commonGrid}
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke="#0d9488" fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Crop Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.cropDist || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" dataKey="value">
                                    {data.charts.cropDist?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
            );
        case 'expenses':
            return (
                <>
                    <ChartCard title="Expenses by Category">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.categoryDist || []} cx="50%" cy="50%" outerRadius={80} fill="#ef4444" dataKey="value" label>
                                    {data.charts.categoryDist?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Spending Trend">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.expenseTrend || []}>
                                {commonGrid}
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" name="Amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
            );
        case 'sales':
            return (
                <>
                    <div className="lg:col-span-2">
                        <ChartCard title="Revenue Trend Analysis">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.charts.salesTrend || []}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    {commonGrid}
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" name="Revenue" stroke="#0d9488" fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                    <div className="lg:col-span-2">
                        <ChartCard title="Top Customers (Revenue)">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.charts.topItems || []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" name="Revenue" fill="#8b5cf6" barSize={25} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </>
            );
        case 'inventory':
            return (
                <>
                    <ChartCard title="Top Stock Levels">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.stockLevels || []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" name="Quantity" fill="#3b82f6" barSize={20} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Value by Category">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.categoryValue || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" dataKey="value">
                                    {data.charts.categoryValue?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
            );
        case 'livestock':
             return (
                <>
                    <ChartCard title="Species Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.speciesDist || []} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {data.charts.speciesDist?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Health Status">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.healthDist || []}>
                                {commonGrid}
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                                    {data.charts.healthDist?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Healthy' ? '#22c55e' : entry.name === 'Sick' ? '#ef4444' : '#eab308'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
             );
        case 'tasks':
             return (
                <>
                    <ChartCard title="Pending Tasks by Priority">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.priorityDist || []} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {data.charts.priorityDist?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'High' ? '#ef4444' : entry.name === 'Medium' ? '#eab308' : '#3b82f6'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
             );
        case 'crops':
             return (
                <>
                    <ChartCard title="Yield Estimates vs Actuals">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.yieldComparison || []}>
                                {commonGrid}
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="estimated" name="Est. Yield (kg)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="actual" name="Act. Yield (kg)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Land Usage (Acres)">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.landUsage || []} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {data.charts.landUsage?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
             );
        default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen relative pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Analyze your farm performance</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
                <select className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-primary-500 shadow-sm cursor-pointer" value={period} onChange={handlePeriodChange}>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <div className="relative flex-1 md:flex-none">
                <select className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-primary-500 font-bold shadow-sm cursor-pointer" value={reportType} onChange={handleTypeChange}>
                    <option value="overview">Overview</option>
                    <option value="sales">Sales</option>
                    <option value="expenses">Expenses</option>
                    <option value="inventory">Inventory</option>
                    <option value="crops">Crops</option>
                    <option value="livestock">Livestock</option>
                    <option value="tasks">Tasks</option>
                </select>
                <Filter className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <button onClick={generatePDF} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-lg shadow-primary-200">
                <FileDown className="w-4 h-4" /> <span className="hidden md:inline">PDF</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {renderKPIs()}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderCharts()}
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, icon: Icon, color }: any) {
    const colors: any = { 
        green: "bg-green-50 text-green-600", 
        blue: "bg-blue-50 text-blue-600", 
        purple: "bg-purple-50 text-purple-600", 
        orange: "bg-orange-50 text-orange-600",
        red: "bg-red-50 text-red-600",
        teal: "bg-primary-50 text-primary-600"
    };
    
    return (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all">
            <div>
                <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                {sub && <p className={`text-xs mt-2 font-medium ${sub.includes('Attention') || sub.includes('Urgent') ? 'text-red-500' : 'text-primary-600'}`}>{sub}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colors[color] || colors.teal}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

function ChartCard({ title, children }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm h-96 hover:border-gray-200 transition-colors flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 shrink-0">{title}</h3>
            <div className="flex-1 min-h-0 w-full relative">
                {children}
            </div>
        </div>
    );
}
