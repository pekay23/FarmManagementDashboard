'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Sprout, PawPrint, DollarSign, CheckCircle, FileDown, Calendar, Filter, 
  ChevronDown, Layers, AlertCircle, Clock, Package, AlertTriangle, TrendingUp, HeartPulse 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('overview'); 
  const [period, setPeriod] = useState('month'); 
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchReportData();
  }, [reportType, period]);

  async function fetchReportData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${reportType}&period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }

  // --- HANDLERS TO PREVENT CRASHES ---
  const handleTypeChange = (e: any) => {
      setReportType(e.target.value);
      setData(null);
      setLoading(true);
  };

  const handlePeriodChange = (e: any) => {
      setPeriod(e.target.value);
      setData(null);
      setLoading(true);
  };

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  function generatePDF() {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(`${reportType.toUpperCase()} REPORT`, 105, 25, { align: "center" });
    
    const kpiRows = Object.entries(data.kpi).map(([key, val]: any) => [key.replace('_', ' ').toUpperCase(), val]);
    autoTable(doc, { startY: 65, head: [['Metric', 'Value']], body: kpiRows });
    
    doc.save(`${reportType}_Report.pdf`);
    showNotification("Report downloaded successfully");
  }

  // --- DYNAMIC CONTENT RENDERERS ---

  const renderKPIs = () => {
    if (!data?.kpi) return null;

    switch (reportType) {
        case 'overview':
            return (
                <>
                    <KpiCard title="Total Crops" value={data.kpi.crops} sub="+12% from last period" icon={Sprout} color="green" />
                    <KpiCard title="Total Animals" value={data.kpi.animals} sub="+8% from last period" icon={PawPrint} color="blue" />
                    <KpiCard title="Total Sales" value={`GH₵ ${(data.kpi.sales || 0).toLocaleString()}`} sub="+23% from last period" icon={DollarSign} color="purple" />
                    <KpiCard title="Task Completion" value={`${data.kpi.completion_rate || 0}%`} sub="+5% from last period" icon={TrendingUp} color="orange" />
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
                    <KpiCard title="Total Records" value={data.kpi.total || 0} icon={Layers} color="blue" />
                    <KpiCard title="Active Animals" value={data.kpi.active || 0} icon={PawPrint} color="green" />
                    <KpiCard title="Sick / Injured" value={data.kpi.sick || 0} sub="Requires Attention" icon={HeartPulse} color="red" />
                    <KpiCard title="Sold / Gone" value={data.kpi.sold || 0} icon={DollarSign} color="orange" />
                </>
            );
        default:
            return null;
    }
  };

  const renderCharts = () => {
    if (!data?.charts) return null;

    switch (reportType) {
        case 'overview':
            return (
                <>
                    <ChartCard title="Sales Trend">
                        <AreaChart data={data.charts.salesTrend}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ChartCard>
                    <ChartCard title="Crop Distribution">
                        <PieChart>
                            <Pie data={data.charts.cropDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value">
                                {data.charts.cropDist?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ChartCard>
                </>
            );
        case 'sales':
            return (
                <div className="lg:col-span-2">
                    <ChartCard title="Revenue Trend Analysis">
                        <AreaChart data={data.charts.salesTrend}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" name="Revenue" stroke="#22c55e" fill="url(#colorRev)" />
                        </AreaChart>
                    </ChartCard>
                </div>
            );
        case 'inventory':
            return (
                <div className="lg:col-span-2">
                    <ChartCard title="Top Stock Levels">
                        <BarChart data={data.charts.stockLevels} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" name="Quantity" fill="#3b82f6" barSize={20} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ChartCard>
                </div>
            );
        case 'tasks':
            return (
                <div className="lg:col-span-2">
                    <ChartCard title="Employee Performance (Completed Tasks)">
                        <BarChart data={data.charts.empPerformance}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" name="Tasks" fill="#f97316" barSize={40} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartCard>
                </div>
            );
        case 'crops':
            return (
                <div className="lg:col-span-2">
                    <ChartCard title="Yield Estimates vs Actuals">
                        <BarChart data={data.charts.yieldComparison}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="estimated" name="Est. Yield (kg)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="actual" name="Act. Yield (kg)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartCard>
                </div>
            );
        case 'livestock':
            return (
                <>
                    <ChartCard title="Species Distribution">
                        <PieChart>
                            <Pie data={data.charts.speciesDist} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                                {data.charts.speciesDist?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ChartCard>
                    <ChartCard title="Health Status Breakdown">
                        <BarChart data={data.charts.healthDist}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" name="Count" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                {data.charts.healthDist?.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Healthy' ? '#22c55e' : entry.name === 'Sick' ? '#ef4444' : '#eab308'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartCard>
                </>
            );
        default:
            return null;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen relative">
      
      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm">{toast.message}</p>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Analyze your farm performance</p>
        </div>
        
        <div className="flex gap-3">
            <div className="relative">
                <select 
                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-green-500 shadow-sm"
                    value={period}
                    onChange={handlePeriodChange}
                >
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>

            <div className="relative">
                <select 
                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-green-500 font-bold shadow-sm"
                    value={reportType}
                    onChange={handleTypeChange}
                >
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

      {loading || !data ? <div className="text-center py-20 text-gray-400">Loading data...</div> : (
        <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {renderKPIs()}
            </div>

            {/* Charts Grid */}
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
                {sub && <p className={`text-xs mt-2 font-medium ${sub.includes('+') ? 'text-green-600' : 'text-orange-500'}`}>{sub}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colors[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

function ChartCard({ title, children }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm h-96 hover:border-gray-200 transition-colors">
            <h3 className="text-lg font-bold text-gray-800 mb-6">{title}</h3>
            <div className="h-full w-full pb-10">
                <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
            </div>
        </div>
    );
}
