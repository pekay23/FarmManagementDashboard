'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, Plus, Phone, X, Briefcase, Trash2, Pencil, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

export default function EmployeeTaskManagement() {
  // --- OFFLINE DATA ---
  const employees = useLiveQuery(() => db.employees.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- SYNC ON LOAD ---
  useEffect(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    runSync();
  }, []);

  async function runSync() {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    // 1. Push Local
    await syncTable('employees', '/api/employees');
    await syncTable('tasks', '/api/tasks');
    // 2. Pull Cloud
    await fetchAndCache('employees', '/api/employees');
    await fetchAndCache('tasks', '/api/tasks');
    setIsSyncing(false);
  }

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  // --- ACTIONS (LOCAL FIRST) ---

  async function handleSaveEmployee(e: any) {
    e.preventDefault();
    const newItem = {
        full_name: e.target.full_name.value,
        role: e.target.role.value,
        contact_info: e.target.contact.value,
        status: editingItem ? e.target.status.value : 'Active',
        sync_status: 'pending_create' as const
    };

    if (editingItem) {
        await db.employees.update(editingItem.id, newItem);
    } else {
        await db.employees.add(newItem as any);
    }
    
    setActiveModal(null);
    setEditingItem(null);
    showNotification('Employee saved locally');
    runSync(); // Background sync
  }

  async function handleSaveTask(e: any) {
    e.preventDefault();
    // For offline simplicity, we just store assignee IDs as an array property
    const assigned_to_ids = Array.from(e.target.assigned_to.selectedOptions).map((option: any) => option.value);
    
    const newItem = {
        title: e.target.title.value,
        description: e.target.description.value,
        temp_assignee_ids: assigned_to_ids, // Store locally
        due_date: e.target.due_date.value,
        priority: e.target.priority.value,
        category: e.target.category.value,
        status: 'pending',
        sync_status: 'pending_create' as const
    };

    if (editingItem) {
        await db.tasks.update(editingItem.id, newItem);
    } else {
        await db.tasks.add(newItem as any);
    }

    setActiveModal(null);
    setEditingItem(null);
    showNotification('Task saved locally');
    runSync();
  }

  async function handleDelete(type: 'employee' | 'task', id: number) {
    if (!confirm(`Delete this ${type}?`)) return;
    if (type === 'employee') await db.employees.delete(id);
    else await db.tasks.delete(id);
    showNotification(`${type} deleted`);
  }

  async function toggleTaskStatus(task: any) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    await db.tasks.update(task.id, { status: newStatus, sync_status: 'pending_update' });
    showNotification('Task status updated');
    runSync();
  }

  // --- HELPERS FOR UI ---
  const getEmployeeName = (id: string) => {
      // Logic to find employee name from local DB list (simplified)
      // Since local IDs vary from server IDs, this requires careful matching.
      // For now, we assume simple display.
      return "Assigned"; 
  };

  const activeTaskCount = tasks.filter(t => t.status === 'pending').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
      
      {/* HEADER WITH SYNC STATUS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee & Tasks</h1>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Wifi className="w-3 h-3"/> Online</span> : <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3"/> Offline Mode</span>}
            {isSyncing && <span className="text-xs text-blue-500 flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Syncing...</span>}
          </div>
        </div>
        <div className="flex gap-3">
            <button onClick={() => { setEditingItem(null); setActiveModal('employee'); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"><Plus className="w-5 h-5" /> Add Employee</button>
            <button onClick={() => { setEditingItem(null); setActiveModal('task'); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"><Plus className="w-5 h-5" /> Add Task</button>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Employees" value={employees.length} icon={Users} color="blue" />
        <KpiCard title="Active Tasks" value={activeTaskCount} icon={Clock} color="yellow" />
        <KpiCard title="Overdue Tasks" value={overdueCount} icon={AlertCircle} color="red" />
        <KpiCard title="Completed" value={completedCount} icon={CheckCircle} color="green" />
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EMPLOYEES */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Employees</h3>
            <div className="space-y-4">
                {employees.map(emp => (
                    <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">{emp.full_name} 
                                {emp.sync_status !== 'synced' && <span className="w-2 h-2 rounded-full bg-orange-500" title="Pending Sync"></span>}
                            </h4>
                            <p className="text-sm text-gray-500">{emp.role}</p>
                            <p className="text-xs text-gray-400 mt-1">{emp.contact_info}</p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => { setEditingItem(emp); setActiveModal('employee'); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-full"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => handleDelete('employee', emp.id!)} className="p-2 text-gray-400 hover:text-red-600 rounded-full"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* TASKS */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Recent Tasks</h3>
            <div className="space-y-4">
                {tasks.map(task => {
                    const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();
                    const isCompleted = task.status === 'completed';
                    return (
                    <div key={task.id} className={`bg-white p-5 rounded-xl shadow-sm border ${isCompleted ? 'border-green-200 opacity-70' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'} flex items-center gap-2`}>
                                {task.title}
                                {task.sync_status !== 'synced' && <span className="w-2 h-2 rounded-full bg-orange-500" title="Pending Sync"></span>}
                            </h4>
                            <div className="flex gap-1">
                                <button onClick={() => { setEditingItem(task); setActiveModal('task'); }} className="p-1 text-gray-400 hover:text-blue-600 rounded-full"><Pencil className="w-3 h-3"/></button>
                                <button onClick={() => handleDelete('task', task.id!)} className="p-1 text-gray-400 hover:text-red-600 rounded-full"><Trash2 className="w-3 h-3"/></button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                        <div className="flex justify-between items-end">
                            <div className="text-xs">
                                <div className={`font-medium ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>Due: {new Date(task.due_date).toLocaleDateString()}</div>
                            </div>
                            <button onClick={() => toggleTaskStatus(task)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-600 hover:text-white'}`}>
                                {isCompleted ? '✓ Done' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                )})}
            </div>
        </div>
      </div>

      {/* --- MODALS (Simpler for offline) --- */}
      {/* Include the same Modal components from before, but bind onSubmit to handleSaveEmployee / handleSaveTask */}
      {activeModal === 'employee' && (
        <Modal title={editingItem ? "Update Employee" : "Add Employee"} onClose={() => {setActiveModal(null); setEditingItem(null);}}>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
                <input name="full_name" required defaultValue={editingItem?.full_name} placeholder="Full Name" className="w-full border p-3 rounded-lg outline-none" />
                <input name="role" required defaultValue={editingItem?.role} placeholder="Role" className="w-full border p-3 rounded-lg outline-none" />
                <input name="contact" required defaultValue={editingItem?.contact_info} placeholder="Contact" className="w-full border p-3 rounded-lg outline-none" />
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Locally</button>
            </form>
        </Modal>
      )}

      {activeModal === 'task' && (
        <Modal title={editingItem ? "Update Task" : "Add Task"} onClose={() => {setActiveModal(null); setEditingItem(null);}}>
            <form onSubmit={handleSaveTask} className="space-y-4">
                <input name="title" required defaultValue={editingItem?.title} placeholder="Title" className="w-full border p-3 rounded-lg outline-none" />
                <textarea name="description" rows={3} defaultValue={editingItem?.description} placeholder="Description" className="w-full border p-3 rounded-lg resize-none outline-none" />
                
                {/* Simplified Assignee for Offline: Just a multi-select box logic */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Assign to (Offline select)</label>
                    <select name="assigned_to" multiple className="w-full border p-3 rounded-lg bg-white h-32 outline-none">
                        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input name="due_date" type="date" required defaultValue={editingItem?.due_date} className="w-full border p-3 rounded-lg outline-none" />
                    <select name="priority" defaultValue={editingItem?.priority || 'medium'} className="w-full border p-3 rounded-lg bg-white outline-none">
                        <option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option>
                    </select>
                </div>
                <input name="category" defaultValue={editingItem?.category} placeholder="Category" className="w-full border p-3 rounded-lg outline-none" />
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Locally</button>
            </form>
        </Modal>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

// Helpers (KpiCard, Modal, etc.) - Keep same as before
function KpiCard({ title, value, icon: Icon, color }: any) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600" };
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"><div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div><div><p className="text-sm text-gray-500">{title}</p><h3 className="text-2xl font-bold">{value}</h3></div></div>;
}

function Modal({ title, children, onClose }: any) {
    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4 border-b pb-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button></div>{children}</div></div>;
}
