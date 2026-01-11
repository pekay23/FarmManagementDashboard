// app/page.tsx
import { Sprout, Users, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Farm Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening on your farm.</p>
        </div>
        <div className="text-right text-sm text-gray-500 hidden md:block">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Crops" value="3" sub="+2 this month" icon={Sprout} color="green" />
        <KpiCard title="Total Animals" value="3" sub="+5 this month" icon={Users} color="yellow" />
        <KpiCard title="Low Stock Items" value="2" sub="Attention needed" icon={AlertTriangle} color="red" />
        <KpiCard title="Pending Tasks" value="5" sub="5 due soon" icon={Calendar} color="blue" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Sales Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Recent Sales</h2>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="space-y-4">
            <SaleItem name="Grace Osei" item="Goat Milk" price="GH₵ 64.00" date="Mar 08" />
            <SaleItem name="Kofi Asante Market" item="Fresh Maize" price="GH₵ 132.00" date="Mar 10" />
            <SaleItem name="Akosua Mensah" item="Fresh Tomatoes" price="GH₵ 152.30" date="Mar 15" />
          </div>
        </div>

        {/* Upcoming Tasks Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Upcoming Tasks</h2>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-4">
            <TaskItem title="Harvest tomatoes from greenhouse" assign="Assigned to: 3" date="Mar 18" priority="medium" />
            <TaskItem title="Prepare sales report" assign="Assigned to: 4" date="Mar 18" priority="low" />
            <TaskItem title="Clean pig pens" assign="Assigned to: 2" date="Mar 19" priority="medium" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-Components ---

function KpiCard({ title, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600"
  };
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start transition-transform hover:-translate-y-1">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
      </div>
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function SaleItem({ name, item, price, date }: any) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
      <div>
        <h4 className="font-semibold text-gray-800">{name}</h4>
        <p className="text-sm text-gray-500">{item}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-green-600">{price}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>
    </div>
  );
}

function TaskItem({ title, assign, date, priority }: any) {
    const priorityColor = priority === 'high' ? 'bg-red-100 text-red-600' : priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600';
    return (
        <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
            <div>
                <h4 className="font-medium text-gray-800">{title}</h4>
                <p className="text-sm text-gray-500 mt-1">{assign}</p>
            </div>
            <div className="text-right flex flex-col items-end">
                <p className="text-xs text-blue-500 font-medium mb-1">{date}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${priorityColor}`}>{priority}</span>
            </div>
        </div>
    )
}
