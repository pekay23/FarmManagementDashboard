'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Sprout, PawPrint, DollarSign, CheckCircle, FileDown, Filter, 
  ChevronDown, Layers, AlertCircle, Clock, Package, AlertTriangle, TrendingUp, HeartPulse,
  Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils';

// Database Imports
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6'];

// --- TypeScript Interface to fix the "{}" errors ---
interface ReportData {
  kpi: {
    [key: string]: any; // Allows dynamic access like kpi.crops, kpi.total_revenue, etc.
  };
  charts: {
    [key: string]: any[];
  };
}

export default function Reports() {
  const [reportType, setReportType] = useState('overview'); 
  const [period, setPeriod] = useState('month'); 
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // --- 1. FETCH RAW DATA LOCALLY ---
  const rawData = useLiveQuery(async () => {
    return {
      sales: await db.sales.toArray(),
      inventory: await db.inventory.toArray(),
      crops: await db.crops.toArray(),
      livestock: await db.livestock.toArray(),
      tasks: await db.tasks.toArray(),
    };
  }, []);

  // --- 2. DATA PROCESSING ENGINE ---
  const data = useMemo<ReportData | null>(() => {
    if (!rawData) return null;

    const { sales, inventory, crops, livestock, tasks } = rawData;

    // Helper: Filter by Date
    const filterByDate = (items: any[], dateField: string) => {
      if (period === 'all') return items;
      const now = new Date();
      const start = new Date();
      
      if (period === 'month') start.setMonth(now.getMonth(), 1);
      if (period === 'year') start.setFullYear(now.getFullYear(), 0, 1);
      
      start.setHours(0,0,0,0);

      return items.filter(item => {
        const d = new Date(item[dateField]);
        return d >= start;
      });
    };

    const filteredSales = filterByDate(sales, 'sale_date');
    const filteredTasks = filterByDate(tasks, 'created_at'); 
    
    // Initialize with Record type to avoid "{}" TS errors
    let kpi: Record<string, any> = {};
    let charts: Record<string, any[]> = {};

    switch (reportType) {
      case 'overview':
        const totalRev = filteredSales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
        const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
        const completionRate = filteredTasks.length ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;
        
        kpi = {
          crops: crops.length,
          animals: livestock.length,
          sales: totalRev,
          completion_rate: completionRate
        };

        const salesByDate = filteredSales.reduce((acc: any, s) => {
          const d = new Date(s.sale_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          acc[d] = (acc[d] || 0) + Number(s.total_amount);
          return acc;
        }, {});
        charts.salesTrend = Object.entries(salesByDate).map(([name, value]) => ({ name, value }));

        const cropGroups = crops.reduce((acc: any, c) => {
          const type = c.crop_type || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        charts.cropDist = Object.entries(cropGroups).map(([name, value]) => ({ name, value }));
        break;

      case 'sales':
        const revenue = filteredSales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
        const avgTicket = filteredSales.length ? revenue / filteredSales.length : 0;
        
        kpi = {
          total_revenue: revenue,
          total_transactions: filteredSales.length,
          avg_ticket: avgTicket
        };

        const revTrend = filteredSales.reduce((acc: any, s) => {
          const d = new Date(s.sale_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          acc[d] = (acc[d] || 0) + Number(s.total_amount);
          return acc;
        }, {});
        charts.salesTrend = Object.entries(revTrend).map(([name, value]) => ({ name, value }));

        const itemSales: any = {};
        filteredSales.forEach(sale => {
          const items = sale.items_snapshot || sale.items_data || [];
          items.forEach((i: any) => {
            itemSales[i.name] = (itemSales[i.name] || 0) + (Number(i.qty) * Number(i.price));
          });
        });
        charts.topItems = Object.entries(itemSales)
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
        break;

      case 'inventory':
        const validInv = inventory.filter(i => i.sync_status !== 'deleted');
        const valuation = validInv.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unit_price)), 0);
        const lowStock = validInv.filter(i => Number(i.quantity) <= Number(i.min_threshold)).length;
        
        kpi = {
          valuation,
          low_stock: lowStock,
          total_items: validInv.length
        };

        charts.stockLevels = [...validInv]
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 7)
          .map(i => ({ name: i.item_name, value: i.quantity }));

        const catVal = validInv.reduce((acc: any, i) => {
          acc[i.category] = (acc[i.category] || 0) + (Number(i.quantity) * Number(i.unit_price));
          return acc;
        }, {});
        charts.categoryValue = Object.entries(catVal).map(([name, value]) => ({ name, value }));
        break;

      case 'tasks':
        const tCompleted = filteredTasks.filter(t => t.status === 'completed').length;
        const tPending = filteredTasks.filter(t => t.status === 'pending').length;
        const tOverdue = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;
        
        kpi = {
            total: filteredTasks.length,
            completed: tCompleted,
            pending: tPending,
            overdue: tOverdue
        };

        const empPerf = filteredTasks.reduce((acc: any, t) => {
            const emp = t.assigned_to || 'Unassigned';
            if (t.status === 'completed') acc[emp] = (acc[emp] || 0) + 1;
            return acc;
        }, {});
        charts.empPerformance = Object.entries(empPerf).map(([name, value]) => ({ name, value }));

        const prioDist = filteredTasks.reduce((acc: any, t) => {
            const p = t.priority || 'medium';
            acc[p] = (acc[p] || 0) + 1;
            return acc;
        }, {});
        charts.priorityDist = Object.entries(prioDist).map(([name, value]) => ({ name, value }));
        break;

      case 'crops':
        kpi = {
            total: crops.length,
            harvested: crops.filter(c => c.status === 'harvested').length,
            planted: crops.filter(c => c.status === 'planted').length
        };
        charts.landUsage = crops.map(c => ({ name: c.crop_type || 'Unknown', value: Number(c.plot_size_acres || 1) }));
        break;
    
      case 'livestock':
        const isInactive = (status: string) => status === 'Sold' || status === 'Deceased';
        
        kpi = {
            total: livestock.length,
            active: livestock.filter(a => !isInactive(a.health_status)).length,
            sick: livestock.filter(a => a.health_status === 'Sick').length,
            sold: livestock.filter(a => a.health_status === 'Sold').length
        };
        
        const specDist = livestock.reduce((acc: any, a) => {
            const s = a.species || 'Unknown';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        charts.speciesDist = Object.entries(specDist).map(([name, value]) => ({ name, value }));
        break;
    }

    return { kpi, charts };

  }, [rawData, reportType, period]);

  // --- 3. SYNC & SETUP ---
  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => { setIsOnline(true); runSync(); });
        window.addEventListener('offline', () => setIsOnline(false));
        runSync();
    }
  }, []);

  async function runSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncing(true);
    try {
        const tables = ['sales', 'inventory', 'crops', 'livestock', 'tasks'];
        await Promise.all(tables.map(t => syncTable(t, `/api/${t}`)));
        await Promise.all(tables.map(t => fetchAndCache(t, `/api/${t}`)));
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  }

  // --- 4. PDF GENERATION ---
  async function generatePDF() {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, 210, 45, 'F');
    
    if (logoBase64) {
      const svgString = atob(logoBase64.split(',')[1]);
      await addSvgToPdf(doc, svgString, 15, 7, 30, 30);
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(`${reportType.toUpperCase()} REPORT`, 105, 28, { align: "center" });
    
    const kpiRows = Object.entries(data.kpi).map(([key, val]: any) => [
        key.replace(/_/g, ' ').toUpperCase(), 
        typeof val === 'number' && (key.includes('revenue') || key.includes('sales') || key.includes('valuation')) ? `GHS ${val.toLocaleString()}` : val
    ]);
    
    autoTable(doc, { 
        startY: 65, 
        head: [['Metric', 'Value']], 
        body: kpiRows,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] }
    });
    
    doc.save(`${reportType}_Report.pdf`);
    showNotification("Report downloaded successfully");
  }

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  // --- RENDERERS ---
  const renderKPIs = () => {
    if (!data?.kpi) return null;
    switch (reportType) {
        case 'overview':
            return (
                <>
                    <KpiCard title="Total Crops" value={data.kpi.crops || 0} sub="Active Fields" icon={Sprout} color="green" />
                    <KpiCard title="Total Animals" value={data.kpi.animals || 0} sub="On Farm" icon={PawPrint} color="blue" />
                    <KpiCard title="Total Sales" value={`GH₵ ${(data.kpi.sales || 0).toLocaleString()}`} sub="Selected Period" icon={DollarSign} color="purple" />
                    <KpiCard title="Task Completion" value={`${data.kpi.completion_rate || 0}%`} sub="Efficiency Rate" icon={TrendingUp} color="orange" />
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
                    <ChartCard title="Sales Trend">
                        {data.charts.salesTrend && data.charts.salesTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.charts.salesTrend}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    {commonGrid}
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data</div>
                        )}
                    </ChartCard>

                    <ChartCard title="Crop Distribution">
                         {data.charts.cropDist && data.charts.cropDist.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.charts.cropDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                        {data.charts.cropDist.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                         ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">No crops recorded</div>
                         )}
                    </ChartCard>
                </>
            );
        case 'sales':
            return (
                <>
                    <div className="lg:col-span-2">
                        <ChartCard title="Revenue Trend Analysis">
                            {data.charts.salesTrend && data.charts.salesTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.charts.salesTrend}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        {commonGrid}
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="value" name="Revenue" stroke="#22c55e" fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
                        </ChartCard>
                    </div>
                    <div className="lg:col-span-2">
                        <ChartCard title="Top Selling Products">
                            {data.charts.topItems && data.charts.topItems.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.topItems} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="value" name="Revenue" fill="#8b5cf6" barSize={20} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
                        </ChartCard>
                    </div>
                </>
            );
        case 'inventory':
            return (
                <>
                    <ChartCard title="Top Stock Levels">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.stockLevels} layout="vertical" margin={{ left: 20 }}>
                                {commonGrid}
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" name="Quantity" fill="#3b82f6" barSize={20} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Value by Category">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.categoryValue} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" dataKey="value">
                                    {data.charts.categoryValue?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </>
            );
        case 'tasks':
            return (
                <>
                    <ChartCard title="Employee Performance (Completed)">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.empPerformance}>
                                {commonGrid}
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" name="Tasks" fill="#f97316" barSize={40} radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Pending Tasks by Priority">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.charts.priorityDist} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {data.charts.priorityDist?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'high' ? '#ef4444' : entry.name === 'medium' ? '#eab308' : '#3b82f6'} />
                                    ))}
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
                                <Pie data={data.charts.speciesDist} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {data.charts.speciesDist?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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

  if (!mounted) return <div className="p-8 text-center text-gray-400">Loading reports...</div>;

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen relative">
      
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-gray-500">Analyze your farm performance</p>
             {isOnline ? 
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 ml-2"><Wifi className="w-3 h-3"/> Online</span> : 
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 ml-2"><WifiOff className="w-3 h-3"/> Offline</span>
             }
             {isSyncing && <span className="text-xs text-blue-500 flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Syncing...</span>}
          </div>
        </div>
        
        <div className="flex gap-3">
            <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-green-500 shadow-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-green-500 font-bold shadow-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                    <option value="overview">Overview Report</option>
                    <option value="sales">Sales Report</option>
                    <option value="inventory">Inventory Report</option>
                    <option value="crops">Crop Report</option>
                    <option value="livestock">Livestock Report</option>
                    <option value="tasks">Task Report</option>
                </select>
                <Filter className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <button onClick={generatePDF} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-green-200">
                <FileDown className="w-4 h-4" /> Generate PDF
            </button>
        </div>
      </div>

      {!data ? (
        <div className="text-center py-20 text-gray-400">Processing data...</div>
      ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {renderKPIs()}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {renderCharts()}
            </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, sub, icon: Icon, color }: any) {
    const colors: any = { 
        green: "bg-green-50 text-green-600", 
        blue: "bg-blue-50 text-blue-600", 
        purple: "bg-purple-50 text-purple-600", 
        orange: "bg-orange-50 text-orange-600",
        red: "bg-red-50 text-red-600"
    };
    
    return (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all">
            <div>
                <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                {sub && <p className={`text-xs mt-2 font-medium ${sub.includes('+') || sub.includes('Active') ? 'text-green-600' : 'text-orange-500'}`}>{sub}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colors[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

function ChartCard({ title, children }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm h-96 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 shrink-0">{title}</h3>
            <div className="flex-1 min-h-0 w-full relative">
                {children}
            </div>
        </div>
    );
}
