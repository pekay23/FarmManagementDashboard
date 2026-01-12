'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, Plus, Phone, X, Briefcase, Trash2, Pencil } from 'lucide-react';

export default function EmployeeTaskManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  // New State for Confirmation Modal
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean, type: string, id: string | null }>({ show: false, type: '', id: null });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
        const [empRes, taskRes] = await Promise.all([ fetch('/api/employees'), fetch('/api/tasks') ]);
        if (empRes.ok) setEmployees(await empRes.json());
        if (taskRes.ok) setTasks(await taskRes.json());
    } catch (e) {
        console.error("Data fetch error", e);
    }
  }

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  // --- ACTIONS ---

  async function handleSaveEmployee(e: any) {
    e.preventDefault();
    const body = {
        full_name: e.target.full_name.value,
        role: e.target.role.value,
        contact_info: e.target.contact.value,
        status: editingItem ? e.target.status.value : 'Active'
    };
    const method = editingItem ? 'PUT' : 'POST';
    if (editingItem) (body as any).id = editingItem.id;

    const res = await fetch('/api/employees', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    if (res.ok) {
        fetchData();
        setActiveModal(null);
        setEditingItem(null);
        showNotification(editingItem ? 'Employee updated' : 'Employee added');
    }
  }

  async function handleSaveTask(e: any) {
    e.preventDefault();
    const assigned_to_ids = Array.from(e.target.assigned_to.selectedOptions).map((option: any) => option.value);
    
    const body = {
        title: e.target.title.value,
        description: e.target.description.value,
        assigned_to_ids,
        due_date: e.target.due_date.value,
        priority: e.target.priority.value,
        category: e.target.category.value
    };
    const method = editingItem ? 'PUT' : 'POST';
    if (editingItem) (body as any).id = editingItem.id;

    const res = await fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    if (res.ok) {
        fetchData();
        setActiveModal(null);
        setEditingItem(null);
        showNotification(editingItem ? 'Task updated' : 'Task assigned');
    }
  }

  // Updated Delete Logic
  function openDeleteConfirmation(type: 'employee' | 'task', id: string) {
    setConfirmDelete({ show: true, type, id });
  }

  async function executeDelete() {
    if (!confirmDelete.id) return;
    
    const { type, id } = confirmDelete;

    const res = await fetch(`/api/${type}s`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if (res.ok) {
        fetchData();
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
    }
    setConfirmDelete({ show: false, type: '', id: null }); // Close modal
  }

  async function toggleTaskStatus(task: any) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: newStatus }) });
    if (res.ok) {
        fetchData();
        showNotification('Task status updated');
    }
  }

  const activeTaskCount = tasks.filter(t => t.status === 'pending').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

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
            <button onClick={() => { setEditingItem(null); setActiveModal('employee'); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> Add Employee
            </button>
            <button onClick={() => { setEditingItem(null); setActiveModal('task'); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> Add Task
            </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Employees" value={employees.length} icon={Users} color="blue" />
        <KpiCard title="Active Tasks" value={activeTaskCount} icon={Clock} color="yellow" />
        <KpiCard title="Overdue Tasks" value={overdueCount} icon={AlertCircle} color="red" />
        <KpiCard title="Completed" value={completedCount} icon={CheckCircle} color="green" />
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
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">{emp.full_name} <StatusBadge status={emp.status} /></h4>
                            <p className="text-sm text-gray-500">{emp.role}</p>
                            <p className="text-xs text-gray-400 mt-1">{emp.contact_info}</p>
                            <div className="mt-2 text-xs flex gap-2">
                                <div className="text-yellow-700">{emp.active_count || 0} active</div>
                                <div className="text-green-700">{emp.completed_count || 0} completed</div>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => { setEditingItem(emp); setActiveModal('employee'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => openDeleteConfirmation('employee', emp.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                ))}
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
                    <div key={task.id} className={`bg-white p-5 rounded-xl shadow-sm border ${isCompleted ? 'border-green-200 opacity-70' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.title}</h4>
                            <div className="flex gap-1">
                                <button onClick={() => { setEditingItem(task); setActiveModal('task'); }} className="p-1 text-gray-400 hover:text-blue-600 rounded-full"><Pencil className="w-3 h-3"/></button>
                                <button onClick={() => openDeleteConfirmation('task', task.id)} className="p-1 text-gray-400 hover:text-red-600 rounded-full"><Trash2 className="w-3 h-3"/></button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                        <div className="flex justify-between items-end">
                            <div className="text-xs">
                                <p className="text-gray-500">Assigned: <span className="font-medium">{task.assignee_names || 'Unassigned'}</span></p>
                                <p className={isOverdue ? 'text-red-500 font-bold' : 'text-blue-500'}>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</p>
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

      {/* Modals */}
      {activeModal === 'employee' && (
        <Modal title={editingItem ? "Update Employee" : "Add Employee"} onClose={() => {setActiveModal(null); setEditingItem(null);}}>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
                <input name="full_name" required defaultValue={editingItem?.full_name} className="w-full border p-3 rounded-lg" />
                <input name="role" required defaultValue={editingItem?.role} className="w-full border p-3 rounded-lg" />
                <input name="contact" required defaultValue={editingItem?.contact_info} className="w-full border p-3 rounded-lg" />
                {editingItem && (
                    <select name="status" defaultValue={editingItem?.status} className="w-full border p-3 rounded-lg bg-white">
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Terminated">Terminated</option>
                    </select>
                )}
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">
                    {editingItem ? "Update Employee" : "Save Employee"}
                </button>
            </form>
        </Modal>
      )}

      {activeModal === 'task' && (
        <Modal title={editingItem ? "Update Task" : "Add Task"} onClose={() => {setActiveModal(null); setEditingItem(null);}}>
            <form onSubmit={handleSaveTask} className="space-y-4">
                <input name="title" required defaultValue={editingItem?.title} className="w-full border p-3 rounded-lg" />
                <textarea name="description" rows={3} defaultValue={editingItem?.description} className="w-full border p-3 rounded-lg resize-none" />
                <select name="assigned_to" multiple className="w-full border p-3 rounded-lg bg-white h-32">
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <input name="due_date" type="date" required defaultValue={editingItem ? new Date(editingItem.due_date).toISOString().split('T')[0] : ''} className="w-full border p-3 rounded-lg text-gray-500" />
                    <select name="priority" defaultValue={editingItem?.priority || 'medium'} className="w-full border p-3 rounded-lg bg-white">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <input name="category" defaultValue={editingItem?.category} className="w-full border p-3 rounded-lg" />
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">
                    {editingItem ? "Update Task" : "Save Task"}
                </button>
            </form>
        </Modal>
      )}
      
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 text-center">
                <div className="mx-auto bg-red-100 rounded-full w-12 h-12 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold mt-4">Are you sure?</h3>
                <p className="text-sm text-gray-500 mt-2">Do you really want to delete this {confirmDelete.type}? This action cannot be undone.</p>
                <div className="flex gap-4 mt-6">
                    <button onClick={() => setConfirmDelete({ show: false, type: '', id: null })} className="flex-1 bg-gray-100 py-2.5 rounded-lg font-medium">Cancel</button>
                    <button onClick={executeDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold">Delete</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600" };
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"><div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div><div><p className="text-sm text-gray-500">{title}</p><h3 className="text-2xl font-bold">{value}</h3></div></div>;
}

function Modal({ title, children, onClose }: any) {
    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4 border-b pb-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button></div>{children}</div></div>;
}

function StatusBadge({ status }: { status: string}) {
    const styles: any = { 'Active': 'bg-green-100 text-green-700', 'On Leave': 'bg-yellow-100 text-yellow-700', 'Terminated': 'bg-red-100 text-red-700'};
    return <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
}
