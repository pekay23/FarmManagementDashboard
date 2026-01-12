'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, Plus, Phone, X, Briefcase } from 'lucide-react';

export default function EmployeeTaskManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [activeModal, setActiveModal] = useState<'employee' | 'task' | null>(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
        const [empRes, taskRes] = await Promise.all([
            fetch('/api/employees'),
            fetch('/api/tasks')
        ]);
        
        const empData = await empRes.json();
        const taskData = await taskRes.json();

        if (Array.isArray(empData)) setEmployees(empData);
        if (Array.isArray(taskData)) setTasks(taskData);
    } catch (e) {
        console.error("Failed to load data", e);
    }
  }

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  async function handleAddEmployee(e: any) {
    e.preventDefault();
    const body = {
        full_name: e.target.full_name.value,
        role: e.target.role.value,
        contact_info: e.target.contact.value
    };

    const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        fetchData();
        setActiveModal(null);
        showNotification('Employee added successfully');
    } else {
        alert("Failed to add employee");
    }
  }

  async function handleAddTask(e: any) {
    e.preventDefault();
    const body = {
        title: e.target.title.value,
        description: e.target.description.value,
        assigned_to: e.target.assigned_to.value,
        due_date: e.target.due_date.value,
        priority: e.target.priority.value,
        category: e.target.category.value
    };

    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        fetchData();
        setActiveModal(null);
        showNotification('Task assigned successfully');
    } else {
        alert("Failed to add task");
    }
  }

  async function toggleTaskStatus(task: any) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    
    const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus })
    });

    if (res.ok) {
        fetchData();
        showNotification(newStatus === 'completed' ? 'Task marked completed' : 'Task reactivated');
    }
  }

  const activeTaskCount = tasks.filter(t => t.status === 'pending').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
  const completedToday = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
      
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Employee & Task Management</h1>
        <div className="flex gap-3">
            <button onClick={() => setActiveModal('employee')} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> Add Employee
            </button>
            <button onClick={() => setActiveModal('task')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> Add Task
            </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Employees" value={employees.length} icon={Users} color="blue" />
        <KpiCard title="Active Tasks" value={activeTaskCount} icon={Clock} color="yellow" />
        <KpiCard title="Overdue Tasks" value={overdueCount} icon={AlertCircle} color="red" />
        <KpiCard title="Completed" value={completedToday} icon={CheckCircle} color="green" />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Employees */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Employees</h3>
            <div className="space-y-4">
                {employees.map(emp => (
                    <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900">{emp.full_name}</h4>
                            <p className="text-sm text-gray-500">{emp.role}</p>
                            <p className="text-xs text-gray-400 mt-1">{emp.contact_info}</p>
                        </div>
                        <div className="text-right text-xs">
                            <div className="text-yellow-600 mb-1">{emp.active_count} active</div>
                            <div className="text-green-600">{emp.completed_count} completed</div>
                        </div>
                    </div>
                ))}
                {employees.length === 0 && <p className="text-gray-400 italic">No employees found.</p>}
            </div>
        </div>

        {/* Tasks */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Recent Tasks</h3>
            <div className="space-y-4">
                {tasks.map(task => {
                    const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();
                    const isCompleted = task.status === 'completed';
                    return (
                    <div key={task.id} className={`bg-white p-5 rounded-xl shadow-sm border ${isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.title}</h4>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 uppercase font-bold text-gray-500">{task.priority}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                        <div className="flex justify-between items-end">
                            <div className="text-xs">
                                <p className="text-gray-500">Assigned: <span className="font-medium">{task.assignee_name || 'Unassigned'}</span></p>
                                <p className={isOverdue ? 'text-red-500 font-bold' : 'text-blue-500'}>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <button onClick={() => toggleTaskStatus(task)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-600 hover:text-white'}`}>
                                {isCompleted ? <><CheckCircle className="w-3 h-3"/> Done</> : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                )})}
                {tasks.length === 0 && <p className="text-gray-400 italic">No tasks found.</p>}
            </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'employee' && (
        <Modal title="Add Employee" onClose={() => setActiveModal(null)}>
            <form onSubmit={handleAddEmployee} className="space-y-4">
                <input name="full_name" required placeholder="Full Name" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="role" required placeholder="Role" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="contact" required placeholder="Contact" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Employee</button>
            </form>
        </Modal>
      )}

      {activeModal === 'task' && (
        <Modal title="Add Task" onClose={() => setActiveModal(null)}>
            <form onSubmit={handleAddTask} className="space-y-4">
                <input name="title" required placeholder="Title" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <textarea name="description" rows={3} placeholder="Description" className="w-full border p-3 rounded-lg resize-none outline-none focus:border-green-500" />
                <select name="assigned_to" className="w-full border p-3 rounded-lg bg-white outline-none focus:border-green-500">
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <input name="due_date" type="date" required className="w-full border p-3 rounded-lg text-gray-500 outline-none focus:border-green-500" />
                    <select name="priority" className="w-full border p-3 rounded-lg bg-white outline-none focus:border-green-500">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <input name="category" placeholder="Category" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Task</button>
            </form>
        </Modal>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600" };
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div>
        <div><p className="text-sm text-gray-500 font-medium">{title}</p><h3 className="text-2xl font-bold text-gray-900">{value}</h3></div>
      </div>
    );
}

function Modal({ title, children, onClose }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                {children}
            </div>
        </div>
    )
}
