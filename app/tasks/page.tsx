'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { CheckCircle, Clock, Plus, Trash2, X, AlertTriangle, Calendar } from 'lucide-react';

// ✅ SAFE UUID GENERATOR
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function TasksPage() {
  const tasks = useLiveQuery(() => db.tasks.toArray().then(rows => rows.reverse())) || [];
  const employees = useLiveQuery(() => db.employees.filter(emp => emp.isActive).toArray()) || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const toggleAssignee = (name: string) => {
    setSelectedAssignees(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const getAssigneeName = (ids: string) => {
      if(!ids) return "Unassigned";
      return ids.split(',').join(', '); 
  };

  async function handleAddTask(e: any) {
    e.preventDefault();
    const title = e.target.title.value;
    const description = e.target.description.value;
    const priority = e.target.priority.value;
    const dueDate = e.target.due_date.value;
    
    if (selectedAssignees.length === 0) {
        toast.error("Please assign the task to at least one employee.");
        return;
    }
    
    try {
        await db.tasks.add({
            id: generateUUID(), 
            title,
            description,
            priority,
            dueDate,
            assignedTo: selectedAssignees.join(','),
            status: 'Pending',
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as any);
        toast.success("Task created");
        setIsModalOpen(false);
        setSelectedAssignees([]);
    } catch (err) {
        toast.error("Error creating task");
    }
  }

  // ✅ FIX: Correct implementation for toggling task status
  async function toggleStatus(task: any) {
      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      try {
          await db.tasks.update(task.id, { 
              status: newStatus, 
              syncStatus: 'updated',
              updatedAt: new Date().toISOString()
          });
          toast.success(`Task marked as ${newStatus}`);
      } catch (err) {
          console.error("Failed to update task status:", err);
          toast.error("Failed to update status");
      }
  }

  // ✅ FIX: Correct implementation for deleting a task
  async function deleteTask(id: string) {
      if(confirm("Delete this task?")) {
          const task = await db.tasks.get(id);
          if (task && task.syncStatus === 'pending') {
             await db.tasks.delete(id);
          } else {
             await db.tasks.update(id, { syncStatus: 'deleted', updatedAt: new Date().toISOString() });
          }
          toast.success("Task deleted");
      }
  }

  const filteredTasks = tasks.filter(t => t.syncStatus !== 'deleted' && (filter === 'All' ? true : t.status === filter));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
        <button onClick={() => { setIsModalOpen(true); setSelectedAssignees([]); }} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
        </button>
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto">
          {['All', 'Pending', 'Completed'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                  {f}
              </button>
          ))}
      </div>
      <div className="grid gap-4">
          {filteredTasks.length === 0 && <div className="text-center py-10 text-gray-400">No tasks found.</div>}
          
          {filteredTasks.map((task: any) => (
              <div key={task.id} className={`p-4 rounded-xl border-2 transition-all ${task.status === 'Completed' ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-100 hover:border-primary-200 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                          <button onClick={() => toggleStatus(task)} className={`mt-1 p-1 rounded-full ${task.status === 'Completed' ? 'text-green-600 bg-green-100' : 'text-gray-300 hover:text-green-600 border-2 border-gray-200'}`}>
                              <CheckCircle className="w-5 h-5" />
                          </button>
                          <div>
                              <h3 className={`font-bold text-lg ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{task.title}</h3>
                              <p className="text-sm text-gray-600">{task.description}</p>
                              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                  <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      <Calendar className="w-3 h-3"/> {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                  <span className={`px-2 py-1 rounded font-bold uppercase ${
                                      task.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                      task.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                      {task.priority}
                                  </span>
                                  <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                                      To: {getAssigneeName(task.assignedTo)}
                                  </span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-2">
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          ))}
      </div>
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Create Task</h2>
                      <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
                  </div>
                  <form onSubmit={handleAddTask} className="space-y-4">
                      <input name="title" required placeholder="Task Title" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                      <textarea name="description" placeholder="Description" rows={3} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 resize-none" />
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Priority</label><select name="priority" className="w-full border p-3 rounded-lg bg-white mt-1"><option>Medium</option><option>High</option><option>Low</option></select></div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Due Date</label><input name="due_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg mt-1" /></div>
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Assign To</label>
                          <div className="border p-3 rounded-lg bg-white max-h-40 overflow-y-auto mt-1">
                              {employees.length === 0 ? (
                                  <p className="text-xs text-gray-400">No active employees found.</p>
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
                                              {emp.name}
                                          </label>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold">Create Task</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
