// app/employees/page.tsx
'use client';

import { useState } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, Plus, Phone, Calendar, X } from 'lucide-react';

// Mock Data (Matches IMG_4198)
const initialEmployees = [
  { id: 1, name: 'Samuel Adjei', role: 'Farm Supervisor', contact: '+233 24 111 2233', active: 1, completed: 0 },
  { id: 2, name: 'Mary Ofosu', role: 'Livestock Caretaker', contact: '+233 20 444 5566', active: 1, completed: 1 },
  { id: 3, name: 'John Ampong', role: 'Crop Specialist', contact: '+233 26 777 8899', active: 2, completed: 0 },
  { id: 4, name: 'Esther Bonsu', role: 'Sales Assistant', contact: '+233 55 123 4567', active: 1, completed: 0 },
];

const initialTasks = [
  { id: 1, title: 'Check irrigation system', desc: 'Inspect and test all irrigation lines', assign: 'Samuel Adjei', due: 'Mar 21', priority: 'medium', status: 'pending' },
  { id: 2, title: 'Prepare sales report', desc: 'Compile weekly sales data for owner', assign: 'Esther Bonsu', due: 'Mar 18', priority: 'low', status: 'pending' },
  { id: 3, title: 'Clean pig pens', desc: 'Weekly cleaning and disinfection', assign: 'Mary Ofosu', due: 'Mar 19', priority: 'medium', status: 'pending' },
  { id: 4, title: 'Apply Fertilizer', desc: 'Plot A001 Maize field', assign: 'John Ampong', due: 'Mar 20', priority: 'high', status: 'overdue' },
];

export default function EmployeeTaskManagement() {
  const [activeModal, setActiveModal] = useState<'employee' | 'task' | null>(null);

  const overdueCount = initialTasks.filter(t => t.status === 'overdue').length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee & Task Management</h1>
          <p className="text-gray-500">Manage your team and assign tasks</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setActiveModal('employee')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
                <Plus className="w-5 h-5" /> Add Employee
            </button>
            <button 
                onClick={() => setActiveModal('task')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
                <Plus className="w-5 h-5" /> Add Task
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Employees" value="4" icon={Users} color="blue" />
        <KpiCard title="Active Tasks" value="5" icon={Clock} color="yellow" />
        <KpiCard title="Overdue Tasks" value={overdueCount.toString()} icon={AlertCircle} color="red" />
        <KpiCard title="Completed Today" value="0" icon={CheckCircle} color="green" />
      </div>

      {/* Alert Banner */}
      {overdueCount > 0 && (
          <div className="mb-8 bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
                <h3 className="font-bold text-red-700">Overdue Tasks</h3>
                <p className="text-sm text-red-600">{overdueCount} task(s) are overdue and need immediate attention.</p>
            </div>
          </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Employees */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Employees</h3>
            <div className="space-y-4">
                {initialEmployees.map(emp => (
                    <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900">{emp.name}</h4>
                            <p className="text-sm text-gray-500 mb-2">{emp.role}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Phone className="w-3 h-3" /> {emp.contact}
                            </div>
                        </div>
                        <div className="text-right text-xs font-medium">
                            <div className="text-yellow-600 mb-1">{emp.active} active</div>
                            <div className="text-green-600">{emp.completed} completed</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Column: Recent Tasks */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Recent Tasks</h3>
            <div className="space-y-4">
                {initialTasks.map(task => (
                    <div key={task.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                        {task.status === 'overdue' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                        
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">{task.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wide
                                ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-green-100 text-green-700'}`}>
                                {task.priority}
                            </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">{task.desc}</p>
                        
                        <div className="flex justify-between items-center text-xs">
                            <div className="text-gray-500">
                                Assigned to: <span className="font-medium text-gray-700">{task.assign}</span>
                            </div>
                            <div className={`font-medium ${task.status === 'overdue' ? 'text-red-500' : 'text-blue-500'}`}>
                                Due: {task.due}
                            </div>
                        </div>
                        
                        <button className="absolute bottom-4 right-4 text-gray-300 hover:text-green-500 transition-colors">
                            <CheckCircle className="w-6 h-6" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Add Employee Modal */}
      {activeModal === 'employee' && (
        <Modal title="Add New Employee" onClose={() => setActiveModal(null)}>
            <form className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="text" placeholder="Role/Position" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="text" placeholder="Contact (Phone/Email)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                
                <div className="flex gap-4 mt-6">
                    <button type="button" onClick={() => setActiveModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium transition-colors">Cancel</button>
                    <button type="button" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors">Add Employee</button>
                </div>
            </form>
        </Modal>
      )}

      {/* Add Task Modal */}
      {activeModal === 'task' && (
        <Modal title="Add New Task" onClose={() => setActiveModal(null)}>
            <form className="space-y-4">
                <input type="text" placeholder="Task Title" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <textarea rows={3} placeholder="Task Description" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none" />
                
                <select className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none">
                    <option>Assign to Employee</option>
                    <option>Samuel Adjei</option>
                    <option>Mary Ofosu</option>
                </select>

                <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="w-full border border-gray-300 p-3 rounded-lg text-gray-500 focus:ring-2 focus:ring-green-500 outline-none" />
                    <select className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none">
                        <option>Select Priority</option>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                    </select>
                </div>

                <input type="text" placeholder="Category (e.g., Feeding, Harvesting)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />

                <div className="flex gap-4 mt-6">
                    <button type="button" onClick={() => setActiveModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium transition-colors">Cancel</button>
                    <button type="button" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors">Add Task</button>
                </div>
            </form>
        </Modal>
      )}

    </div>
  );
}

// --- Helper Components ---

function KpiCard({ title, value, icon: Icon, color }: any) {
    const colors: any = {
      blue: "bg-blue-50 text-blue-600",
      yellow: "bg-yellow-50 text-yellow-600",
      red: "bg-red-50 text-red-600",
      green: "bg-green-50 text-green-600"
    };
  
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
      </div>
    );
}

function Modal({ title, children, onClose }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
