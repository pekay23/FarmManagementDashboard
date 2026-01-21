'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  Users, Clock, AlertCircle, CheckCircle, Plus, 
  X, Briefcase, Trash2, Pencil, Calendar, AlertTriangle, Phone 
} from 'lucide-react';

export default function EmployeeTaskManagement() {
  // 1. REAL-TIME DATA
  const employees = useLiveQuery(() => db.employees.toArray().then(rows => rows.reverse())) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray().then(rows => rows.reverse())) || [];

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Custom State for Checkbox Multi-Select
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  // Delete Confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean, type: string, id: number | null }>({ show: false, type: '', id: null });

  // --- ACTIONS (Offline First) ---

  async function handleSaveEmployee(e: any) {
    e.preventDefault();
    const formData = {
        name: e.target.full_name.value,
        role: e.target.role.value,
        phone: e.target.contact.value, 
        isActive: e.target.status.value === 'Active',
        updatedAt: new Date().toISOString()
    };

    try {
        if (editingItem) {
            await db.employees.update(editingItem.id, { ...formData, syncStatus: 'updated' });
            toast.success("Employee updated");
        } else {
            await db.employees.add({ 
                ...formData, 
                createdAt: new Date().toISOString(),
                syncStatus: 'pending' 
            } as any);
            toast.success("Employee added");
        }
        setActiveModal(null);
        setEditingItem(null);
    } catch (err) {
        toast.error("Failed to save employee");
    }
  }

  async function handleSaveTask(e: any) {
    e.preventDefault();
    const formData = {
        title: e.target.title.value,
        description: e.target.description.value,
        assignedTo: selectedAssignees.join(','), 
        dueDate: e.target.due_date.value,
        priority: e.target.priority.value,
        status: editingItem ? editingItem.status : 'Pending', // Preserve status on edit
        updatedAt: new Date().toISOString()
    };

    try {
        if (editingItem) {
            await db.tasks.update(editingItem.id, { 
                ...formData, 
                syncStatus: 'updated' 
            });
            toast.success("Task updated");
        } else {
            await db.tasks.add({ 
                ...formData, 
                createdAt: new Date().toISOString(),
                syncStatus: 'pending' 
            } as any);
            toast.success("Task assigned");
        }
        setActiveModal(null);
        setEditingItem(null);
        setSelectedAssignees([]);
    } catch (err) {
        toast.error("Failed to save task");
    }
  }

  async function executeDelete() {
    if (!confirmDelete.id) return;
    const { type, id } = confirmDelete;

    try {
        if (type === 'employee') {
            await db.employees.delete(id);
        } else {
            await db.tasks.delete(id);
        }
        toast.success(`${type === 'employee' ? 'Employee' : 'Task'} deleted`);
    } catch (err) {
        toast.error("Delete failed");
    }
    setConfirmDelete({ show: false, type: '', id: null });
  }

  async function toggleTaskStatus(task: any) {
    const newStatus = task.status === 'Pending' ? 'Completed' : 'Pending';
    try {
        await db.tasks.update(task.id, { 
            status: newStatus,
            syncStatus: 'updated',
            updatedAt: new Date().toISOString()
        });
        toast.success(`Task marked as ${newStatus}`);
    } catch (err) {
        toast.error("Failed to update status");
    }
  }

  // --- Helper to open modals with correct data ---
  function openTaskModal(task?: any) {
      setEditingItem(task || null);
      // Parse assignedTo string back to array if editing
      if (task?.assignedTo) {
          setSelectedAssignees(task.assignedTo.split(','));
      } else {
          setSelectedAssignees([]);
      }
      setActiveModal('task');
  }

  function toggleAssignee(empName: string) {
      if (selectedAssignees.includes(empName)) {
          setSelectedAssignees(selectedAssignees.filter(name => name !== empName));
      } else {
          setSelectedAssignees([...selectedAssignees, empName]);
      }
  }

  // KPIs
  const activeTaskCount = tasks.filter(t => t.status === 'Pending').length;
  const overdueCount = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen relative pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Team & Tasks</h1>
            <p className="text-gray-500">Manage your workforce and daily assignments</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => { setEditingItem(null); setActiveModal('employee'); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium flex-1 md:flex-none">
                <Plus className="w-5 h-5" /> Add Employee
            </button>
            <button onClick={() => openTaskModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium flex-1 md:flex-none">
                <Plus className="w-5 h-5" /> Add Task
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard title="Total Staff" value={employees.length} icon={Users} color="blue" />
        <KpiCard title="Active Tasks" value={activeTaskCount} icon={Clock} color="yellow" />
        <KpiCard title="Overdue" value={overdueCount} icon={AlertCircle} color="red" />
        <KpiCard title="Completed" value={completedCount} icon={CheckCircle} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* EMPLOYEES LIST */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400"/> Employees
            </h3>
            <div className="space-y-4">
                {employees.length === 0 && <p className="text-gray-400 text-sm italic">No employees added yet.</p>}
                {employees.map((emp: any) => (
                    <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                {emp.name} 
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {emp.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </h4>
                            <p className="text-sm text-gray-500">{emp.role}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <Phone className="w-3 h-3" /> {emp.phone}
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => { setEditingItem(emp); setActiveModal('employee'); }} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => { setConfirmDelete({ show: true, type: 'employee', id: emp.id }); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* TASKS LIST */}
        <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400"/> Recent Tasks
            </h3>
            <div className="space-y-4">
                {tasks.length === 0 && <p className="text-gray-400 text-sm italic">No tasks created yet.</p>}
                {tasks.map((task: any) => {
                    const isOverdue = task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();
                    const isCompleted = task.status === 'Completed';
                    
                    return (
                    <div key={task.id} className={`bg-white p-5 rounded-xl shadow-sm border transition-all ${isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.title}</h4>
                            <div className="flex gap-1">
                                <button onClick={() => openTaskModal(task)} className="p-1 text-gray-400 hover:text-primary-600 rounded-full"><Pencil className="w-3 h-3"/></button>
                                <button onClick={() => setConfirmDelete({ show: true, type: 'task', id: task.id })} className="p-1 text-gray-400 hover:text-red-600 rounded-full"><Trash2 className="w-3 h-3"/></button>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                        
                        {/* Assignees Tags */}
                        {task.assignedTo && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {task.assignedTo.split(',').map((name: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-end border-t border-gray-100 pt-3 mt-2">
                            <div className="text-xs flex items-center gap-3">
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                    {isOverdue ? <AlertTriangle className="w-3 h-3"/> : <Calendar className="w-3 h-3"/>}
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Date'}
                                </span>
                                <span className={`uppercase font-bold text-[10px] ${
                                    task.priority === 'High' ? 'text-red-600' : 
                                    task.priority === 'Medium' ? 'text-yellow-600' : 'text-gray-500'
                                }`}>
                                    {task.priority} Priority
                                </span>
                            </div>
                            <button 
                                onClick={() => toggleTaskStatus(task)} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 
                                ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-primary-600 hover:text-white'}`}
                            >
                                {isCompleted ? '✓ Done' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                )})}
            </div>
        </div>
      </div>

      {/* MODAL: Employee */}
      {activeModal === 'employee' && (
        <Modal title={editingItem ? "Update Employee" : "Add Employee"} onClose={() => {setActiveModal(null); setEditingItem(null);}}>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input name="full_name" required defaultValue={editingItem?.name} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="e.g. John Doe" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role / Position</label>
                    <input name="role" required defaultValue={editingItem?.role} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="e.g. Farm Manager" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input name="contact" required defaultValue={editingItem?.phone} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="e.g. 055-123-4567" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" defaultValue={editingItem?.isActive ? "Active" : "Inactive"} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-primary-500">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold">
                    {editingItem ? "Update Employee" : "Save Employee"}
                </button>
            </form>
        </Modal>
      )}

      {/* MODAL: Task */}
      {activeModal === 'task' && (
        <Modal title={editingItem ? "Update Task" : "Add Task"} onClose={() => {setActiveModal(null); setEditingItem(null);}}>
            <form onSubmit={handleSaveTask} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                    <input name="title" required defaultValue={editingItem?.title} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="e.g. Fix Irrigation" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows={3} defaultValue={editingItem?.description} className="w-full border p-3 rounded-lg resize-none outline-none focus:border-primary-500" placeholder="Details about the task..." />
                </div>
                
                {/* CHECKBOX MULTI-SELECT */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Employee(s)</label>
                    <div className="border p-3 rounded-lg bg-white max-h-40 overflow-y-auto">
                        {employees.length === 0 ? (
                            <p className="text-xs text-gray-400">No employees found. Add one first.</p>
                        ) : (
                            employees.map((emp: any) => (
                                <div key={emp.id} className="flex items-center gap-2 mb-2 last:mb-0 hover:bg-gray-50 p-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        id={`emp-${emp.id}`} 
                                        value={emp.name}
                                        checked={selectedAssignees.includes(emp.name)}
                                        onChange={() => toggleAssignee(emp.name)}
                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                    />
                                    <label htmlFor={`emp-${emp.id}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1">
                                        {emp.name} <span className="text-gray-400 text-xs">({emp.role})</span>
                                    </label>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        {/* SAFE DATE HANDLING HERE */}
                        <input 
                            name="due_date" 
                            type="date" 
                            required 
                            defaultValue={editingItem?.dueDate ? new Date(editingItem.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                            className="w-full border p-3 rounded-lg text-gray-500 outline-none focus:border-primary-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" defaultValue={editingItem?.priority || 'Medium'} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-primary-500">
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>
                <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold">
                    {editingItem ? "Update Task" : "Save Task"}
                </button>
            </form>
        </Modal>
      )}
      
      {/* DELETE CONFIRMATION */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95">
                <div className="mx-auto bg-red-100 rounded-full w-12 h-12 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold mt-4">Are you sure?</h3>
                <p className="text-sm text-gray-500 mt-2">Do you really want to delete this {confirmDelete.type}? This action cannot be undone.</p>
                <div className="flex gap-4 mt-6">
                    <button onClick={() => setConfirmDelete({ show: false, type: '', id: null })} className="flex-1 bg-gray-100 py-2.5 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
                    <button onClick={executeDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600" };
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow"><div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div><div><p className="text-sm text-gray-500">{title}</p><h3 className="text-2xl font-bold text-gray-800">{value}</h3></div></div>;
}

function Modal({ title, children, onClose }: any) {
    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}><div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4 border-b pb-4"><h2 className="text-xl font-bold text-gray-900">{title}</h2><button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button></div>{children}</div></div>;
}
