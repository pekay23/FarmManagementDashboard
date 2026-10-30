'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Sprout, Users, DollarSign, Calendar, TrendingDown, AlertTriangle, 
  CheckCircle, Activity, Package, Clock, Wallet, Building
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { db } from '@/lib/db'; 
import { Skeleton } from '@/components/ui/Skeleton';
import WeatherWidget from '@/components/WeatherWidget';

// 1. Rename the main logic component to DashboardContent
function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const selectedFarm = searchParams.get('farm_id') || 'all';
  const isSuperAdmin = (session?.user as any)?.is_superadmin;

  async function loadApiData() {
    setLoading(true);
    const url = `/api/dashboard?farm_id=${selectedFarm}`;
    
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch dashboard data.");
      const dashboardData = await res.json();
      setData(dashboardData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOfflineData() {
    setLoading(true);
    try {
      const notDeleted = (item: any) => item.syncStatus !== 'deleted';
      const [livestock, crops, sales, inventory, tasks, expenses] = await Promise.all([
        db.livestock.filter(notDeleted).toArray(),
        db.crops.filter(notDeleted).toArray(),
        db.sales.filter(notDeleted).toArray(),
        db.inventory.filter(notDeleted).toArray(),
        db.tasks.filter(notDeleted).toArray(),
        db.expenses.filter(notDeleted).toArray()
      ]);
      const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
      
      const lowStock = inventory.filter(i => i.quantity <= i.lowStockThreshold);
      
      const overdue = tasks.filter(t => t.status === 'Pending' && t.dueDate && new Date(t.dueDate).getTime() < new Date().getTime());
      
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      const upcomingHarvests = crops
        .filter(c => {
          const status = c.status?.toLowerCase() || '';
          const harvestDate = c.expected_harvest_date ? new Date(c.expected_harvest_date) : null;
          return (status === 'growing' || status === 'planted') && harvestDate && harvestDate >= today && harvestDate <= thirtyDaysLater;
        })
        .sort((a, b) => new Date(a.expected_harvest_date || '9999-12-31').getTime() - new Date(b.expected_harvest_date || '9999-12-31').getTime())
        .slice(0, 5);
      
      const salesByDay: Record<string, number> = {};
      sales.forEach(sale => {
          const dateStr = new Date(sale.date).toISOString().split('T')[0];
          salesByDay[dateStr] = (salesByDay[dateStr] || 0) + (Number(sale.amount) || 0);
      });
      const salesTrend = Object.keys(salesByDay).sort().slice(-7).map(dateKey => ({
          name: new Date(dateKey).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          value: salesByDay[dateKey]
      }));

      const activity = [...sales.map(s => ({ type: 'sale', title: 'New Sale Recorded', date: s.date || new Date().toISOString(), detail: `+GH₵${s.amount}` })), ...expenses.map(e => ({ type: 'expense', title: 'Expense: ' + e.title, date: e.date || new Date().toISOString(), detail: `-GH₵${e.amount}` })), ...tasks.filter(t => t.status === 'Completed').map(t => ({ type: 'task', title: 'Task Completed', date: t.updatedAt || new Date().toISOString(), detail: t.title }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setData({
        kpi: {
          crops: crops.length,
          animals: livestock.length,
          sales: totalRevenue,
          expenses: totalExpenses,
          profit: netProfit,
          tasks: pendingTasks
        },
        alerts: { lowStock, overdue, harvests: upcomingHarvests },
        charts: { salesTrend },
        activity
      });
    } catch (e: any) {
      console.error("Failed to load dashboard data", e);
      setError(e.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSuperAdmin === undefined) return; 
    
    if (isSuperAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadApiData();
    } else {
      loadOfflineData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarm, isSuperAdmin]);

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newFarmId = e.target.value;
      router.push(`/?farm_id=${newFarmId}`);
  };

  if (loading) {
    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8">
            <Skeleton className="h-12 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
        </div>
    );
  }

  if (error) {
      return (
          <div className="p-10 text-center">
              <div className="inline-block p-4 rounded-full bg-red-50 text-red-500 mb-4"><AlertTriangle className="w-8 h-8" /></div>
              <h2 className="text-xl font-bold text-card-foreground">Dashboard Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Reload</button>
          </div>
      )
  }

  if (!data) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
              <Package className="w-12 h-12 animate-pulse mb-4 opacity-20" />
              <p>No dashboard data available.</p>
          </div>
      );
  }

  const hasAlerts = (data.alerts?.lowStock?.length > 0) || (data.alerts?.overdue?.length > 0) || (data.alerts?.harvests?.length > 0);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
              {isSuperAdmin ? 'Platform Overview' : 'Farm Command Center'}
          </h1>
          <p className="text-muted-foreground">Overview for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        
        {isSuperAdmin && data.allFarms && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
                <Building className="w-5 h-5 text-muted-foreground" />
                <select 
                    onChange={handleFarmChange}
                    value={selectedFarm}
                    className="bg-transparent text-sm font-medium focus:outline-none"
                >
                    <option value="all">All Farms (Aggregate)</option>
                    {data.allFarms.map((farm: any) => (
                        <option key={farm.id} value={farm.id}>
                            {farm.name}
                        </option>
                    ))}
                </select>
            </div>
        )}
        {!isSuperAdmin && (
          <div className="hidden md:block bg-card px-4 py-2 rounded-lg border border-border shadow-sm text-sm font-medium text-muted-foreground">
             FieldOps - Offline Ready
          </div>
        )}
      </div>

      {hasAlerts && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.alerts.lowStock.length > 0 && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-card p-2 rounded-full shadow-sm"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-800 text-sm">Low Stock Alert</h3>
                        <div className="mt-1 space-y-1">
                            {data.alerts.lowStock.slice(0, 3).map((item: any, i: number) => (
                                <p key={i} className="text-xs text-red-600">• {item.name} ({item.quantity} {item.unit} left)</p>
                            ))}
                        </div>
                        <Link href="/inventory" className="text-xs font-bold text-red-700 mt-2 block hover:underline">Restock Now →</Link>
                    </div>
                </div>
            )}
            {data.alerts.overdue.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-card p-2 rounded-full shadow-sm"><Clock className="w-5 h-5 text-orange-600" /></div>
                    <div className="flex-1">
                        <h3 className="font-bold text-orange-800 text-sm">Overdue Tasks</h3>
                        <div className="mt-1 space-y-1">
                            {data.alerts.overdue.slice(0, 3).map((task: any, i: number) => (
                                <p key={i} className="text-xs text-orange-700">• {task.title} (Due: {new Date(task.dueDate).toLocaleDateString()})</p>
                            ))}
                        </div>
                        <Link href="/tasks" className="text-xs font-bold text-orange-800 mt-2 block hover:underline">Manage Tasks →</Link>
                    </div>
                </div>
            )}
            {data.alerts.harvests.length > 0 && (
                <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-card p-2 rounded-full shadow-sm"><Sprout className="w-5 h-5 text-teal-600" /></div>
                    <div className="flex-1">
                        <h3 className="font-bold text-teal-800 text-sm">Upcoming Harvests</h3>
                        <div className="mt-1 space-y-1">
                            {data.alerts.harvests.map((crop: any, i: number) => (
                                <p key={i} className="text-xs text-teal-700">• {crop.crop_type} - {crop.plot_number} (Exp: {new Date(crop.expected_harvest_date).toLocaleDateString()})</p>
                            ))}
                        </div>
                        <Link href="/crops" className="text-xs font-bold text-teal-800 mt-2 block hover:underline">View Crops →</Link>
                    </div>
                </div>
            )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        <KpiCard title="Net Profit" value={`GH₵ ${(data.kpi.profit || 0).toLocaleString()}`} icon={Wallet} color={data.kpi.profit >= 0 ? "green" : "red"} />
        <KpiCard title="Total Revenue" value={`GH₵ ${(data.kpi.sales || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
        <KpiCard title="Total Expenses" value={`GH₵ ${(data.kpi.expenses || 0).toLocaleString()}`} icon={TrendingDown} color="orange" />
        <KpiCard title="Active Crops" value={data.kpi.crops || 0} icon={Sprout} color="teal" />
        <KpiCard title="Livestock" value={data.kpi.animals || 0} icon={Users} color="blue" />
        <KpiCard title="Pending Tasks" value={data.kpi.tasks || 0} icon={Calendar} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-card-foreground">Revenue Trend (Last 7 Days)</h2>
            <Link href="/sales" className="text-sm text-primary-600 font-medium hover:underline">View Sales</Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={data.charts.salesTrend.length ? data.charts.salesTrend : [{name: 'No Data', value: 0}]}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₵${value}`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-6">
            <WeatherWidget />
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border h-full max-h-[400px] overflow-y-auto">
                <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2 sticky top-0 bg-card z-10 pb-2">
                    <Activity className="w-5 h-5 text-primary-600" /> Recent Activity
                </h2>
                <div className="space-y-4">
                    {data.activity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity found.</p>}
                    {data.activity.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                            <div className={`p-2 rounded-full ${
                                item.type === 'sale' ? 'bg-primary-50 text-primary-600' : 
                                item.type === 'expense' ? 'bg-red-50 text-red-600' :
                                'bg-blue-50 text-blue-600'
                            }`}>
                                {item.type === 'sale' ? <DollarSign className="w-4 h-4" /> : 
                                 item.type === 'expense' ? <TrendingDown className="w-4 h-4" /> :
                                 <CheckCircle className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-card-foreground">{item.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{new Date(item.date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className={`font-bold ${
                                        item.type === 'sale' ? 'text-primary-600' : 
                                        item.type === 'expense' ? 'text-red-600' : 
                                        'text-blue-500'
                                    }`}>
                                        {item.detail}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-primary-600" /> Active Crops
              </h2>
              {data.alerts.harvests.length === 0 ? (
                  <div className="bg-primary-50 p-4 rounded-lg text-center">
                      <p className="text-primary-800 font-medium text-sm">No active crops found.</p>
                      <Link href="/crops" className="text-primary-600 text-xs hover:underline mt-1 block">Add your first crop +</Link>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {data.alerts.harvests.map((crop: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg hover:bg-secondary transition-colors">
                              <div>
                                  <p className="font-bold text-card-foreground text-sm">{crop.crop_type} <span className="text-muted-foreground font-normal">({crop.plot_number})</span></p>
                                  <p className="text-xs text-muted-foreground">
                                    {crop.expected_harvest_date ? `Harvest: ${new Date(crop.expected_harvest_date).toLocaleDateString()}` : 'No harvest date'}
                                  </p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded-md ${crop.status === 'Planted' ? 'bg-blue-100 text-blue-700' : 'bg-primary-50 text-primary-700'}`}>
                                {crop.status}
                              </span>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h2 className="text-lg font-bold text-card-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
                <QuickAction href="/crops" title="Add Crop" color="bg-primary-50 text-primary-700 hover:bg-primary-100" icon={Sprout} />
                <QuickAction href="/livestock" title="Add Animal" color="bg-yellow-50 text-yellow-700 hover:bg-yellow-100" icon={Users} />
                <QuickAction href="/sales" title="Record Sale" color="bg-purple-50 text-purple-700 hover:bg-purple-100" icon={DollarSign} />
                <QuickAction href="/expenses" title="Record Expense" color="bg-orange-50 text-orange-700 hover:bg-orange-100" icon={TrendingDown} />
            </div>
          </div>
      </div>
    </div>
  );
}

// 2. Wrap main component in Suspense
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    teal: "bg-primary-100 text-primary-600",
    green: "bg-green-100 text-green-600", 
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600"
  };
  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex justify-between items-start hover:-translate-y-1 transition-transform cursor-default">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-card-foreground">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colors[color] || colors.teal}`}>
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
    )
}

