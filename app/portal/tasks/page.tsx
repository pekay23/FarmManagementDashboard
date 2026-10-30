'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { CheckCircle, Plus, Trash2, Calendar, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

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
    } catch {
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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-20">
      <PageHeader 
        title="Task Board" 
        description="Manage and assign tasks to your team"
        actions={
          <Button variant="primary" onClick={() => { setIsModalOpen(true); setSelectedAssignees([]); }}>
              <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
        }
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Pending', 'Completed'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
              >
                  {f}
              </button>
          ))}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState 
          icon={<ClipboardList className="w-12 h-12" />} 
          title="No tasks found" 
          description={filter === 'All' ? "Get started by creating a new task." : `No ${filter.toLowerCase()} tasks found.`}
          actionLabel={filter === 'All' ? "Create Task" : "View All Tasks"}
          onAction={() => filter === 'All' ? setIsModalOpen(true) : setFilter('All')}
        />
      ) : (
        <div className="grid gap-4">
            {filteredTasks.map((task: any) => (
                <Card key={task.id} className={`transition-all ${task.status === 'Completed' ? 'bg-muted  opacity-75' : 'hover:border-primary-200 dark:hover:border-primary-800 shadow-sm'}`}>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 md:gap-4">
                              <button onClick={() => toggleStatus(task)} className={`mt-1 p-1 rounded-full transition-colors shrink-0 ${task.status === 'Completed' ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground hover:text-green-600 border-2 border-border  dark:hover:border-green-600 dark:text-muted-foreground'}`}>
                                  <CheckCircle className="w-5 h-5" />
                              </button>
                              <div>
                                  <h3 className={`font-bold text-lg leading-tight ${task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-card-foreground '}`}>{task.title}</h3>
                                  {task.description && <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">{task.description}</p>}
                                  
                                  <div className="flex flex-wrap gap-2 mt-3">
                                      <Badge variant="secondary" className="gap-1 font-normal">
                                          <Calendar className="w-3.5 h-3.5"/> {new Date(task.dueDate).toLocaleDateString()}
                                      </Badge>
                                      <Badge variant={
                                          task.priority === 'High' ? 'danger' : 
                                          task.priority === 'Medium' ? 'warning' : 'info'
                                      } className="uppercase tracking-wide">
                                          {task.priority}
                                      </Badge>
                                      <Badge variant="info" className="font-normal">
                                          To: {getAssigneeName(task.assignedTo)}
                                      </Badge>
                                  </div>
                              </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-red-500 dark:text-muted-foreground dark:hover:text-red-400 p-2 transition-colors shrink-0">
                              <Trash2 className="w-5 h-5" />
                          </button>
                      </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Task">
          <form onSubmit={handleAddTask} className="space-y-4">
              <Input name="title" required placeholder="Task Title" />
              
              <div>
                <textarea 
                  name="description" 
                  placeholder="Description" 
                  rows={3} 
                  className="w-full border border-border bg-card p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-card-foreground transition-shadow" 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase dark:text-muted-foreground mb-1 block">Priority</label>
                    <Select name="priority">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase dark:text-muted-foreground mb-1 block">Due Date</label>
                    <Input name="due_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
              </div>
              
              <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase dark:text-muted-foreground block mb-1">Assign To</label>
                  <div className="border border-border p-3 rounded-lg bg-card max-h-40 overflow-y-auto">
                      {employees.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No active employees found.</p>
                      ) : (
                          employees.map((emp: any) => (
                              <div key={emp.id} className="flex items-center gap-3 mb-2 last:mb-0 hover:bg-muted p-1.5 rounded transition-colors">
                                  <input 
                                      type="checkbox" 
                                      id={`emp-${emp.id}`} 
                                      value={emp.name}
                                      checked={selectedAssignees.includes(emp.name)}
                                      onChange={() => toggleAssignee(emp.name)}
                                      className="w-4 h-4 text-primary-600 rounded border-border focus:ring-primary-500 cursor-pointer dark:checked:bg-primary-600"
                                  />
                                  <label htmlFor={`emp-${emp.id}`} className="text-sm text-foreground cursor-pointer select-none flex-1 font-medium">
                                      {emp.name}
                                  </label>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full">Create Task</Button>
              </div>
          </form>
      </Modal>
    </div>
  );
}
