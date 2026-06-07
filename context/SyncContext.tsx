'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { db, FarmDatabase } from '@/lib/db';
import { toast } from 'sonner';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  syncNow: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const hasPulledData = useRef(false);
  const isSuperAdmin = (session?.user as { is_superadmin?: boolean } | undefined)?.is_superadmin;
  const canSync = status === 'authenticated' && !isSuperAdmin;

  // --- MAPPER HELPERS ---
  const mapLocalTaskToServer = async (t: any) => {
    const assigneeIds = [];
    if (t.assignedTo) {
        const names = t.assignedTo.split(',').map((n: string) => n.trim());
        for (const name of names) {
            const emp = await db.employees.where('name').equals(name).first();
            if (emp && emp.id) assigneeIds.push(emp.id);
        }
    }
    const uniqueIds = [...new Set(assigneeIds)];

    return {
        id: t.id,
        title: t.title,
        description: t.description,
        assigned_to_ids: uniqueIds,
        due_date: t.dueDate,
        priority: t.priority,
        category: t.category || 'General',
        status: t.status,
        updatedAt: t.updatedAt
    };
  };

  function mapServerToLocal(s: any, tableName: string): any {
    if (!s || !s.id) return {}; 

    const base = {
        id: s.id.toString(),
        syncStatus: 'synced',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || s.created_at || new Date().toISOString()
    };

    switch(tableName) {
        case 'employees': return { ...base, name: s.full_name, role: s.role, phone: s.contact_info, isActive: s.status === 'Active' };
        case 'tasks': return { 
            ...base, 
            title: s.title, 
            description: s.description, 
            status: s.status ? (s.status.charAt(0).toUpperCase() + s.status.slice(1).toLowerCase()) : 'Pending', 
            priority: s.priority ? (s.priority.charAt(0).toUpperCase() + s.priority.slice(1).toLowerCase()) : 'Medium',
            dueDate: s.due_date || s.dueDate, 
            assignedTo: s.assignee_names || s.assignedTo || '', 
            category: s.category || 'General'
        };
        case 'crops': return { ...base, plot_number: s.plot_number, crop_type: s.crop_type, status: s.status, variety: s.variety, planting_date: s.planting_date, expected_harvest_date: s.expected_harvest_date, plot_size_acres: Number(s.plot_size_acres), location: s.location, estimated_yield_kg: Number(s.estimated_yield_kg), actual_yield_kg: Number(s.actual_yield_kg) };
        case 'inventory': return { ...base, name: s.item_name, category: s.category, quantity: Number(s.quantity), unit: s.unit, lowStockThreshold: Number(s.min_threshold), unitPrice: Number(s.unit_price), supplier: s.supplier };
        case 'sales': return { ...base, customer: s.customer || s.buyer_name, amount: Number(s.amount || s.total_amount), date: s.date || s.sale_date, itemsData: s.itemsData };
        case 'expenses': return { ...base, title: s.title, category: s.category, amount: Number(s.amount), date: s.expense_date, notes: s.notes };
        case 'livestock': return { ...base, animal_id: s.animal_id, species: s.species, breed: s.breed, sex: s.sex, date_of_birth: s.date_of_birth, current_weight_kg: Number(s.current_weight_kg), health_status: s.health_status };
        case 'treatments': return { ...base, crop_id: s.crop_id, treatment_type: s.treatment_type, product_name: s.product_name, treatment_date: s.treatment_date, quantity: s.quantity, cost: Number(s.cost), notes: s.notes };
        case 'scouting': return { ...base, crop_id: s.crop_id, field_name: s.field_name, scout_date: s.scout_date, crop_stage: s.crop_stage, issue_type: s.issue_type, severity: s.severity, latitude: Number(s.latitude || 0), longitude: Number(s.longitude || 0), notes: s.notes, recommendation: s.recommendation, status: s.status };
        case 'attachments': return { ...base, entity_type: s.entity_type, entity_id: s.entity_id, file_name: s.file_name, file_type: s.file_type, file_size: Number(s.file_size || 0), url: s.url, data_url: s.data_url, notes: s.notes };
        default: return base;
    }
  }

  async function recordConflict(tableName: string, recordId: string, localData: any, serverData: any, reason: string) {
    const conflict = {
      id: `${tableName}:${recordId}:${Date.now()}`,
      table_name: tableName,
      record_id: String(recordId),
      local_data: localData,
      server_data: serverData,
      reason,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.sync_conflicts.put(conflict);

    try {
      await fetch('/api/sync/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflict),
      });
    } catch {
      // Local conflict storage is the source of truth while offline.
    }
  }

  // --- 1. PUSH ---
  async function pushDataToServer() {
    const dbTyped = db as FarmDatabase;
    const simpleMappers = [
      { table: dbTyped.employees, endpoint: '/api/employees', mapper: (i: any) => ({ ...i, full_name: i.name, contact_info: i.phone, status: i.isActive ? 'Active' : 'Inactive' }) },
      { table: dbTyped.inventory, endpoint: '/api/inventory', mapper: (i: any) => ({ ...i, item_name: i.name, min_threshold: i.lowStockThreshold, unit_price: i.unitPrice }) },
      { table: dbTyped.crops, endpoint: '/api/crops', mapper: (i: any) => ({ ...i }) },
      { table: dbTyped.sales, endpoint: '/api/sales', mapper: (i: any) => ({ ...i, buyer_name: i.customer, total_amount: i.amount, items: i.itemsData, deduct_inventory: false }) },
      { table: dbTyped.expenses, endpoint: '/api/expenses', mapper: (i: any) => ({ ...i, expense_date: i.date }) },
      { table: dbTyped.livestock, endpoint: '/api/livestock', mapper: (i: any) => ({ ...i }) },
      { table: dbTyped.treatments, endpoint: '/api/treatments', mapper: (i: any) => ({ ...i }) },
      { table: dbTyped.scouting, endpoint: '/api/scouting', mapper: (i: any) => ({ ...i }) },
      { table: dbTyped.attachments, endpoint: '/api/attachments', mapper: (i: any) => ({ ...i }) },
    ];

    for (const { table, endpoint, mapper } of simpleMappers) {
      await processTablePush(table, endpoint, mapper);
    }

    const pendingTasks = await dbTyped.tasks.where('syncStatus').notEqual('synced').toArray();
    for (const task of pendingTasks) {
       const payload = await mapLocalTaskToServer(task);
       await processSingleItemPush(dbTyped.tasks, task, '/api/tasks', payload);
    }
  }

  async function processTablePush(table: any, endpoint: string, mapper: Function) {
      const pendingItems = await table.where('syncStatus').notEqual('synced').toArray();
      for (const item of pendingItems) {
          const payload = mapper(item);
          await processSingleItemPush(table, item, endpoint, payload);
      }
  }

  async function processSingleItemPush(table: any, item: any, endpoint: string, payload: any) {
        const isNew = item.syncStatus === 'pending';
        const isDeleted = item.syncStatus === 'deleted';
        
        try {
          const body = isDeleted ? { id: item.id } : { ...payload, id: isNew ? undefined : item.id };
          const method = isDeleted ? 'DELETE' : (isNew ? 'POST' : 'PUT');

          const res = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (res.status === 409 || res.status === 412) {
            let serverData = null;
            try { serverData = await res.json(); } catch {}
            await recordConflict(table.name, item.id, item, serverData, `Server rejected ${method} with ${res.status}`);
            await table.update(item.id, { syncStatus: 'updated' });
            return;
          }

          if (res.ok) {
            if (isDeleted) {
              await table.delete(item.id);
            } else {
              const serverData = await res.json();
              if (serverData && serverData.id) {
                  const serverId = serverData.id.toString();
                  if (isNew) {
                    await table.delete(item.id);
                    await table.put({ 
                        ...item, 
                        ...mapServerToLocal(serverData, table.name),
                        id: serverId, 
                        syncStatus: 'synced' 
                    });
                  } else {
                    await table.update(item.id, { syncStatus: 'synced' });
                  }
              }
            }
          }
        } catch (e) {
          console.error(`Sync error ${endpoint}:`, e);
        }
  }

  // --- 2. PULL ---
  async function pullDataFromServer() {
    const dbTyped = db as FarmDatabase;
    const endpoints = [
      { url: '/api/employees', table: dbTyped.employees },
      { url: '/api/crops', table: dbTyped.crops },
      { url: '/api/tasks', table: dbTyped.tasks },
      { url: '/api/inventory', table: dbTyped.inventory },
      { url: '/api/sales', table: dbTyped.sales },
      { url: '/api/expenses', table: dbTyped.expenses },
      { url: '/api/livestock', table: dbTyped.livestock },
      { url: '/api/treatments?crop_id=ALL', table: dbTyped.treatments },
      { url: '/api/scouting', table: dbTyped.scouting },
      { url: '/api/attachments', table: dbTyped.attachments },
    ];

    for (const { url, table } of endpoints) {
      try {
        const res = await fetch(url, { cache: 'no-store' }); 
        if (!res.ok) continue;
        const serverItems = await res.json();
        if (!Array.isArray(serverItems)) continue;

        await db.transaction('rw', table, async () => {
          // 1. Get all Server IDs for this table
          const serverIds = new Set(serverItems.map((i: any) => i.id.toString()));

          // 2. Update/Insert Server Data
          for (const sItem of serverItems) {
            const localItem = mapServerToLocal(sItem, table.name);
            const existing = await table.get(localItem.id);
            if (existing && existing.syncStatus !== 'synced') {
               const serverUpdated = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
               const localUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
               if (serverUpdated && localUpdated && serverUpdated > localUpdated) {
                  await recordConflict(table.name, localItem.id, existing, localItem, 'Server changed while this record had local edits');
               }
               continue;
            }
            // Overwrite if synced or missing
            if (!existing || existing.syncStatus === 'synced') {
               await table.put(localItem);
            }
          }

          // 3. CLEANUP: Delete local items that are 'synced' but NOT on server anymore
          // (This handles deletions that happened on another device)
          const localSyncedItems = await table.where('syncStatus').equals('synced').toArray();
          const itemsToDelete = localSyncedItems.filter((local: any) => !serverIds.has(local.id));
          
          if (itemsToDelete.length > 0) {
              const deleteIds = itemsToDelete.map((i: any) => i.id);
              await table.bulkDelete(deleteIds);
              console.log(`Cleaned up ${deleteIds.length} stale items from ${table.name}`);
          }
        });
      } catch (e) {
        console.warn(`Failed to pull ${url}`);
      }
    }
  }

  // --- 3. MAIN LOOP ---
  const syncNow = useCallback(async () => {
    if (!canSync) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      try { await pushDataToServer(); } catch (e) { console.error("Push Failed", e); }
      try { await pullDataFromServer(); } catch (e) { console.error("Pull Failed", e); }
      try {
        const openConflicts = await db.sync_conflicts.where('status').equals('open').count();
        if (openConflicts > 0) toast.warning(`${openConflicts} sync conflict${openConflicts === 1 ? '' : 's'} need review`);
      } catch {}
      console.log("Sync cycle complete");
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [canSync]);

  useEffect(() => {
    queueMicrotask(() => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    });
    const handleOffline = () => setIsOnline(false);
    const handleOnlineStatus = () => setIsOnline(true);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!canSync) {
      hasPulledData.current = false;
      isSyncingRef.current = false;
      if (isSyncing) setIsSyncing(false);
      return;
    }

    if (!hasPulledData.current) { syncNow(); hasPulledData.current = true; }

    const interval = setInterval(syncNow, 15000);
    const handleOnline = () => { setIsOnline(true); syncNow(); toast.success("Online: Syncing data..."); };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [canSync, isSyncing, syncNow]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}
