'use client';

import { useState, useEffect } from 'react';
import { 
  Sprout, Users, DollarSign, Calendar, TrendingUp, AlertTriangle, 
  CheckCircle, ArrowRight, Activity, Package, Clock 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading command center...</div>;

  // Check if we have any alerts to show
  const hasAlerts = (data?.alerts?.lowStock?.length > 0) || (data?.alerts?.overdue?.length > 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      
      {/* 1. Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Command Center</h1>
          <p className="text-gray-500">Welcome back! Here is your daily overview.</p>
        </div>
        <div className="text-right text-sm text-gray-500 hidden md:block bg-white px-4 py-2 rounded-lg border shadow-sm">
          <p className="font-medium text-gray-700">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* 2. Smart Alerts Banner (Conditional) */}
      {hasAlerts && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.alerts.lowStock.length > 0 && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                    <div>
                        <h3 className="font-bold text-red-800 text-sm">Low Stock Alert</h3>
                        <div className="mt-1 space-y-1">
                            {data.alerts.lowStock.map((item: any, i: number) => (
                                <p key={i} className="text-xs text-red-600">• {item.item_name} ({item.quantity} {item.unit} left)</p>
                            ))}
                        </div>
                        <Link href="/inventory" className="text-xs font-bold text-red-700 mt-2 block hover:underline">Restock Now →</Link>
                    </div>
                </div>
            )}
            {data.alerts.overdue.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm"><Clock className="w-5 h-5 text-orange-600" /></div>
                    <div>
                        <h3 className="font-bold text-orange-800 text-sm">Overdue Tasks</h3>
                        <div className="mt-1 space-y-1">
                            {data.alerts.overdue.map((task: any, i: number) => (
                                <p key={i} className="text-xs text-orange-700">• {task.title} (Due: {new Date(task.due_date).toLocaleDateString()})</p>
                            ))}
                        </div>
                        <Link href="/employees" className="text-xs font-bold text-orange-800 mt-2 block hover:underline">Manage Tasks →</Link>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* 3. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Crops" value={data?.kpi.crops || 0} icon={Sprout} color="green" />
        <KpiCard title="Total Animals" value={data?.kpi.animals || 0} icon={Users} color="yellow" />
        <KpiCard title="Total Revenue" value={`GH₵ ${(data?.kpi.sales || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
        <KpiCard title="Pending Tasks" value={data?.kpi.tasks || 0} icon={Calendar} color="blue" />
      </div>

      {/* 4. Main Grid: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left: Sales Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Revenue Trend (Last 7 Days)</h2>
            <Link href="/reports" className="text-sm text-blue-600 font-medium hover:underline">View Full Report</Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.charts.salesTrend}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#22c55e" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recent Activity Feed (1 Col) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" /> Recent Activity
            </h2>
            <div className="space-y-4">
                {data?.activity.length === 0 && <p className="text-sm text-gray-400">No recent activity.</p>}
                {data?.activity.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className={`p-2 rounded-full ${item.type === 'sale' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {item.type === 'sale' ? <DollarSign className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className={item.type === 'sale' ? 'text-green-600 font-bold' : 'text-blue-500'}>{item.detail}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* 5. Bottom Grid: Harvests & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Upcoming Harvests */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-green-600" /> Upcoming Harvests
              </h2>
              {data?.alerts.harvests.length === 0 ? (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-green-800 font-medium text-sm">No harvests due soon.</p>
                      <p className="text-green-600 text-xs">Your crops are still growing nicely!</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {data.alerts.harvests.map((crop: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                  <p className="font-bold text-gray-800 text-sm">{crop.crop_type} ({crop.plot_number})</p>
                                  <p className="text-xs text-gray-500">Expected: {new Date(crop.expected_harvest_date).toLocaleDateString()}</p>
                              </div>
                              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-md">Due Soon</span>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* Quick Actions Grid */}
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

// --- Sub-Components ---

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
      <div className={`p-3 rounded-lg ${colors[color]}`}>
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
