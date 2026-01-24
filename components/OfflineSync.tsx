'use client';

import { useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function OfflineSync() {
  const hasPulledData = useRef(false);
  const { data: session } = useSession();
  
  // ✅ FIX: Define isSuperAdmin from the session
  const isSuperAdmin = (session?.user as any)?.is_superadmin;

  useEffect(() => {
    // 🛑 If the user is a Super Admin, do NOT run any sync logic.
    if (isSuperAdmin) {
        console.log("Super Admin detected, skipping offline sync.");
        return;
    }

    if (!hasPulledData.current && navigator.onLine) {
        pullDataFromServer();
        hasPulledData.current = true;
    }

    const interval = setInterval(() => {
        pushDataToServer();
    }, 15000);
    
    const onlineHandler = () => {
        console.log("Back online! Syncing...");
        pushDataToServer();
        pullDataFromServer();
    };
    
    window.addEventListener('online', onlineHandler);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onlineHandler);
    };
  }, [isSuperAdmin]); // Rerun this effect when the session loads

  // --- MAPPERS ---
  const mapEmployeeToLocal = (serverItem: any) => ({
      ...serverItem,
      name: serverItem.full_name || serverItem.name,
      phone: serverItem.contact_info || serverItem.phone,
      isActive: serverItem.status === 'Active' || serverItem.isActive === true,
      syncStatus: 'synced'
  });

  const mapTaskToLocal = (serverItem: any) => ({
      ...serverItem,
      assignedTo: serverItem.assignee_names || serverItem.assignedTo || '',
      dueDate: serverItem.due_date || serverItem.dueDate,
      syncStatus: 'synced'
  });

  const mapInventoryToLocal = (serverItem: any) => ({
      ...serverItem,
      name: serverItem.item_name || serverItem.name,
      lowStockThreshold: serverItem.min_threshold || serverItem.lowStockThreshold,
      unitPrice: Number(serverItem.unit_price || serverItem.unitPrice || 0),
      syncStatus: 'synced'
  });

  const mapCropToLocal = (serverItem: any) => ({
      ...serverItem,
      estimated_yield_kg: Number(serverItem.estimated_yield_kg || 0),
      actual_yield_kg: Number(serverItem.actual_yield_kg || 0),
      plot_size_acres: Number(serverItem.plot_size_acres || 0),
      syncStatus: 'synced'
  });

  const mapExpenseToLocal = (serverItem: any) => ({
      ...serverItem,
      date: serverItem.expense_date || serverItem.date,
      amount: Number(serverItem.amount),
      syncStatus: 'synced'
  });

  // --- PULL ---
  async function pullDataFromServer() {
    try {
        const [crops, animals, inventory, tasks, sales, employees, expenses] = await Promise.all([
            fetch('/api/crops').then(r => r.json()),
            fetch('/api/livestock').then(r => r.json()),
            fetch('/api/inventory').then(r => r.json()),
            fetch('/api/tasks').then(r => r.json()),
            fetch('/api/sales').then(r => r.json()),
            fetch('/api/employees').then(r => r.json()),
            fetch('/api/expenses').then(r => r.json())
        ]);

        await db.transaction('rw', [db.crops, db.livestock, db.inventory, db.tasks, db.sales, db.employees, db.expenses], async () => {
            if (Array.isArray(crops)) await db.crops.bulkPut(crops.map(mapCropToLocal));
            if (Array.isArray(animals)) await db.livestock.bulkPut(animals.map(a => ({...a, syncStatus: 'synced'})));
            if (Array.isArray(inventory)) await db.inventory.bulkPut(inventory.map(mapInventoryToLocal));
            if (Array.isArray(tasks)) await db.tasks.bulkPut(tasks.map(mapTaskToLocal));
            if (Array.isArray(sales)) await db.sales.bulkPut(sales.map(s => ({...s, syncStatus: 'synced'})));
            if (Array.isArray(employees)) await db.employees.bulkPut(employees.map(mapEmployeeToLocal));
            if (Array.isArray(expenses)) await db.expenses.bulkPut(expenses.map(mapExpenseToLocal));
        });
        console.log("✅ Sync complete");
    } catch (error) {
        console.error("Pull failed:", error);
    }
  }

  // --- PUSH ---
  async function pushDataToServer() {
    if (!navigator.onLine) return;

    try {
      // 1. EMPLOYEES
      const pendingEmps = await db.employees.where('syncStatus').notEqual('synced').toArray();
      for (const emp of pendingEmps) {
          if (emp.syncStatus === 'deleted') {
             await fetch('/api/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emp.id }) });
             await db.employees.delete(emp.id!);
             continue;
          }

          const payload = {
              id: emp.id,
              full_name: emp.name,
              role: emp.role,
              contact_info: emp.phone,
              status: emp.isActive ? 'Active' : 'Inactive'
          };
          
          const method = emp.syncStatus === 'updated' ? 'PUT' : 'POST'; 
          const res = await fetch('/api/employees', {
              method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });

          if (res.ok) {
              const serverData = await res.json();
              if (method === 'POST' && serverData.id) {
                  await db.employees.delete(emp.id!);
                  await db.employees.put(mapEmployeeToLocal(serverData));
              } else {
                  await db.employees.update(emp.id!, { syncStatus: 'synced' });
              }
          }
      }

      // 2. TASKS
      const pendingTasks = await db.tasks.where('syncStatus').notEqual('synced').toArray();
      for (const task of pendingTasks) {
        if (task.syncStatus === 'deleted') {
             await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id }) });
             await db.tasks.delete(task.id!);
             continue;
        }

        const assigneeNames = task.assignedTo ? task.assignedTo.split(',') : [];
        const assigneeIds = [];
        
        for (const name of assigneeNames) {
            const emp = await db.employees.where('name').equals(name.trim()).first();
            if (emp && emp.id) {
                assigneeIds.push(emp.id);
            }
        }

        const payload = {
            id: task.id,
            title: task.title,
            description: task.description,
            assigned_to_ids: assigneeIds,
            due_date: task.dueDate,
            priority: task.priority,
            category: 'General',
            status: task.status
        };
        
        const method = task.syncStatus === 'updated' ? 'PUT' : 'POST';
        const res = await fetch('/api/tasks', {
          method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        if (res.ok) {
            await db.tasks.update(task.id!, { syncStatus: 'synced' }); 
        }
      }

      // 3. INVENTORY
      const pendingInv = await db.inventory.where('syncStatus').notEqual('synced').toArray();
      for (const item of pendingInv) {
          if (item.syncStatus === 'deleted') {
             await fetch('/api/inventory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
             await db.inventory.delete(item.id!);
             continue;
          }

          const payload = {
              ...item,
              item_name: item.name,
              min_threshold: item.lowStockThreshold,
              unit_price: item.unitPrice,
              last_updated: item.updatedAt
          };
          
          const method = item.syncStatus === 'updated' ? 'PUT' : 'POST';
          const res = await fetch('/api/inventory', {
              method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });

          if (res.ok) {
              const serverData = await res.json();
              if (method === 'POST' && serverData.id) {
                  await db.inventory.delete(item.id!);
                  await db.inventory.put(mapInventoryToLocal(serverData));
              } else {
                  await db.inventory.update(item.id!, { syncStatus: 'synced' });
              }
          }
      }

      // 4. CROPS
      const pendingCrops = await db.crops.where('syncStatus').notEqual('synced').toArray();
      for (const crop of pendingCrops) {
        if (crop.syncStatus === 'deleted') {
             await fetch('/api/crops', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: crop.id }) });
             await db.crops.delete(crop.id!);
             continue;
        }

        const method = crop.syncStatus === 'updated' ? 'PUT' : 'POST';
        const res = await fetch('/api/crops', {
          method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(crop)
        });

        if (res.ok) {
            const serverData = await res.json();
            if (method === 'POST' && serverData.id) {
                await db.crops.delete(crop.id!);
                await db.crops.put(mapCropToLocal(serverData));
            } else {
                await db.crops.update(crop.id!, { syncStatus: 'synced' });
            }
        }
      }

      // 5. SALES
      const pendingSales = await db.sales.where('syncStatus').notEqual('synced').toArray();
      for (const sale of pendingSales) {
        if (sale.syncStatus === 'deleted') {
             await fetch('/api/sales', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sale.id }) });
             await db.sales.delete(sale.id!);
             continue;
        }

        const payload = {
            buyer_name: sale.customer,
            contact_info: (sale as any).contact_info,
            total_amount: sale.amount,
            items: (sale as any).itemsData || [], 
            deduct_inventory: false 
        };
        
        const res = await fetch('/api/sales', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (res.ok) await db.sales.update(sale.id!, { syncStatus: 'synced' });
      }

      // 6. EXPENSES
      const pendingExpenses = await db.expenses.where('syncStatus').notEqual('synced').toArray();
      for (const exp of pendingExpenses) {
        if (exp.syncStatus === 'deleted') {
             await fetch('/api/expenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: exp.id }) });
             await db.expenses.delete(exp.id!);
             continue;
        }

        const res = await fetch('/api/expenses', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exp)
        });
        if (res.ok) {
            const serverData = await res.json();
            await db.expenses.delete(exp.id!);
            await db.expenses.put(mapExpenseToLocal(serverData));
        }
      }

      if (pendingEmps.length + pendingTasks.length + pendingCrops.length + pendingInv.length + pendingSales.length + pendingExpenses.length > 0) {
          toast.success("Cloud sync complete");
      }

    } catch (error) {
      console.error("Push failed:", error);
    }
  }

  // This component renders nothing.
  return null;
}
