'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Sprout, Users, DollarSign, Calendar, AlertTriangle, 
  Clock, Activity, CheckCircle, Package, Wifi, WifiOff, 
  RefreshCw, TrendingUp 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';
import Link from 'next/link';

// Database Imports
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // --- 1. SAFE KPI DATA ---
  // We wrap this in try/catch to prevent "DexieError" from crashing the page
  const kpiData = useLiveQuery(async () => {
    try {
        // Check if tables exist before querying to prevent crashes
        const cropsCount = db.crops ? await db.crops.count() : 0;
        const animalsCount = db.livestock ? await db.livestock.count() : 0;
        const pendingTasks = db.tasks ? await db.tasks.where({ status: 'pending' }).count() : 0;
        
        let totalRevenue = 0;
        if (db.sales) {
            const allSales = await db.sales.toArray();
            totalRevenue = allSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        }
        
        return { crops: cropsCount, animals: animalsCount, sales: totalRevenue, tasks: pendingTasks };
    } catch (error) {
        console.error("KPI Query Error:", error);
        return { crops: 0, animals: 0, sales: 0, tasks: 0 };
    }
  }, []);

  // --- 2. SAFE ALERTS DATA ---
  const alertsData = useLiveQuery(async () => {
    try {
        const lowStock = db.inventory 
            ? await db.inventory.filter(item => item.quantity <= (item.min_threshold || 0)).limit(3).toArray() 
            : [];
        
        const overdue = db.tasks 
            ? await db.tasks.where('due_date').below(new Date().toISOString()).and(t => t.status !== 'completed').limit(3).toArray()
            : [];

        const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const harvests = db.crops
            ? await db.crops.where('expected_harvest_date').between(new Date().toISOString(), twoWeeksFromNow).limit(5).toArray()
            : [];

        return { lowStock, overdue, harvests };
    } catch (error) {
        console.error("Alerts Query Error:", error);
        return { lowStock: [], overdue: [], harvests: [] };
    }
  }, []);

  // --- 3. SAFE CHART DATA ---
  const activityData = useLiveQuery(async () => {
    try {
        if (!db.sales) return { activity: [], charts: { salesTrend: [] } };

        const sales = await db.sales.toArray();
        
        const recentSales = sales.slice(-5).map(s => ({ 
            type: 'sale' as const, 
            title: `Sale: ${s.buyer_name}`, 
            date: s.sale_date, 
            detail: `GH₵ ${Number(s.total_amount).toFixed(2)}` 
        }));
        
        const salesTrend = sales.slice(-10).map(s => ({ 
            name: new Date(s.sale_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), 
            value: Number(s.total_amount) 
        }));

        return { activity: recentSales.reverse(), charts: { salesTrend } };
    } catch (error) {
        console.error("Activity Query Error:", error);
        return { activity: [], charts: { salesTrend: [] } };
    }
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Delay rendering charts until client is fully mounted
    setTimeout(() => setMounted(true), 100);
    
    setClientDate(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));

    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => { setIsOnline(true); runSync(); });
        window.addEventListener('offline', () => setIsOnline(false));
        runSync();
    }
  }, []);

  async function runSync() {
    if (typeof navigator === 'undefined' || !navigator.onLine || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    
    try {
        // We safely try to sync each table. If one fails (e.g. doesn't exist), it won't stop the others.
        const tables = ['inventory', 'crops', 'livestock', 'sales', 'tasks', 'employees'];
        
        for (const table of tables) {
            try {
                await syncTable(table, `/api/${table}`);
                await fetchAndCache(table, `/api/${table}`);
            } catch (e) {
                console.warn(`Skipping sync for ${table}:`, e);
            }
        }
    } catch (err) {
        console.error("Sync failed:", err);
    } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
    }
  }

  const hasAlerts = (alertsData?.lowStock?.length || 0) > 0 || (alertsData?.overdue?.length || 0) > 0;

  // Render a loading state until mounted to avoid hydration/chart errors
  if (!mounted) return <div className="p-10 text-center text-gray-400">Loading Dashboard...</div>;

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Command Center</h1>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? 
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Wifi className="w-3 h-3"/> Online</span> : 
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3"/> Offline Mode</span>
            }
            {isSyncing && <span className="text-xs text-blue-500 flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Syncing...</span>}
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 hidden md:block bg-white px-4 py-2 rounded-lg border shadow-sm">
          <p className="font-medium text-gray-700">{clientDate}</p>
        </div>
      </div>

      {/* Smart Alerts */}
      {hasAlerts && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertsData?.lowStock?.map((item: any) => (
                <div key={item.id} className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                    <div><h3 className="font-bold text-red-800 text-sm">Low Stock Alert</h3><p className="text-xs text-red-600">• {item.item_name} ({item.quantity} left)</p></div>
                </div>
            ))}
            {alertsData?.overdue?.map((task: any) => (
                <div key={task.id} className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
                     <div className="bg-white p-2 rounded-full shadow-sm"><Clock className="w-5 h-5 text-orange-600" /></div>
                    <div><h3 className="font-bold text-orange-800 text-sm">Overdue Task</h3><p className="text-xs text-orange-700">• {task.title}</p></div>
                </div>
            ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Crops" value={kpiData?.crops ?? '-'} icon={Sprout} color="green" />
        <KpiCard title="Total Animals" value={kpiData?.animals ?? '-'} icon={Users} color="yellow" />
        <KpiCard title="Total Revenue" value={kpiData?.sales ? `GH₵ ${kpiData.sales.toLocaleString()}` : '-'} icon={DollarSign} color="purple" />
        <KpiCard title="Pending Tasks" value={kpiData?.tasks ?? '-'} icon={Calendar} color="blue" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Recent Sales Trend</h2>
          
          {/* Chart Container - Fixed Height is CRITICAL for Recharts */}
          <div className="h-72 w-full relative flex-1">
            {mounted && activityData?.charts?.salesTrend && activityData.charts.salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData.charts.salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `GH₵${val}`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    {mounted ? "No sales data available for chart" : "Loading Chart..."}
                </div>
            )}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h2>
            <div className="space-y-4">
                {(!activityData?.activity || activityData.activity.length === 0) && <p className="text-sm text-gray-400">No recent activity.</p>}
                
                {activityData?.activity?.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className={`p-2 rounded-full ${item.type === 'sale' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {item.type === 'sale' ? <DollarSign className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span>{new Date(item.date).toLocaleDateString()}</span><span>•</span><span>{item.detail}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Upcoming Harvests</h2>
              {(!alertsData?.harvests || alertsData.harvests.length === 0) ? (
                  <div className="text-center text-gray-400 py-10">No harvests due soon.</div>
              ) : (
                  <div className="space-y-3">
                      {alertsData.harvests.map((crop: any) => (
                          <div key={crop.id} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                              <p className="font-bold text-gray-700">{crop.crop_type}</p>
                              <p className="text-sm text-orange-600 font-medium">Due: {new Date(crop.expected_harvest_date).toLocaleDateString()}</p>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
                <QuickAction href="/crops" title="Add Crop" color="bg-green-50 text-green-700 hover:bg-green-100" icon={Sprout} />
                <QuickAction href="/livestock" title="Add Animal" color="bg-yellow-50 text-yellow-700 hover:bg-yellow-100" icon={Users} />
                <QuickAction href="/sales" title="Record Sale" color="bg-purple-50 text-purple-700 hover:bg-purple-100" icon={DollarSign} />
                <QuickAction href="/inventory" title="Update Stock" color="bg-blue-50 text-blue-700 hover:bg-blue-100" icon={Package} />
            </div>
          </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
  const colors: any = { 
    green: "bg-green-100 text-green-600", 
    yellow: "bg-yellow-100 text-yellow-600", 
    purple: "bg-purple-100 text-purple-600", 
    blue: "bg-blue-100 text-blue-600" 
  };
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start hover:-translate-y-1 transition-transform">
        <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colors[color] || 'bg-gray-100'}`}>
            <Icon className="w-6 h-6" />
        </div>
    </div>
  );
}

function QuickAction({ href, title, color, icon: Icon }: any) {
    return (
        <Link href={href} className={`flex flex-col items-center justify-center p-6 rounded-xl font-bold transition-all hover:shadow-md ${color}`}>
            <Icon className="w-6 h-6 mb-2" />
            {title}
        </Link>
    );
}
