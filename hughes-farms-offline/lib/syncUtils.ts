import { db } from './dbLocal';

export async function syncTable(tableName: string, apiEndpoint: string) {
  // @ts-ignore
  const table = db[tableName];
  if (!table) {
    console.warn(`Skipping sync: Table '${tableName}' does not exist in local DB.`);
    return;
  }

  try {
    // 1. Find items that need creating
    const toCreate = await table.where('sync_status').equals('pending_create').toArray();
    for (const item of toCreate) {
      const { id, sync_status, ...data } = item;
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const serverData = await res.json();
          // Update local record with server ID and clear sync flag
          await table.update(id, { ...serverData, sync_status: 'synced' });
        }
      } catch (err) {
        console.error(`Failed to sync create for ${tableName}`, err);
      }
    }

    // 2. Find items that need updating
    const toUpdate = await table.where('sync_status').equals('pending_update').toArray();
    for (const item of toUpdate) {
      const { id, sync_status, sync_id, ...data } = item;
      if (!sync_id && !item.id) continue; 
      
      try {
        const targetId = sync_id || id; 
        const res = await fetch(`${apiEndpoint}/${targetId}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            await table.update(id, { sync_status: 'synced' });
        }
      } catch (err) {
        console.error(`Failed to sync update for ${tableName}`, err);
      }
    }
  } catch (error) {
    console.error(`Sync error for ${tableName}:`, error);
  }
}

export async function fetchAndCache(tableName: string, apiEndpoint: string) {
  // @ts-ignore
  const table = db[tableName];
  if (!table) return;

  try {
    const res = await fetch(apiEndpoint);
    if (!res.ok) return;
    const serverData = await res.json();
    
    if (Array.isArray(serverData)) {
      await db.transaction('rw', table, async () => {
        const pending = await table.where('sync_status').startsWith('pending').toArray();
        await table.clear();
        await table.bulkAdd(pending);
        
        const toAdd = serverData.map((item: any) => ({
             ...item, 
             sync_status: 'synced',
             sync_id: item.id
        }));
        await table.bulkAdd(toAdd);
      });
    }
  } catch (error) {
    console.error(`Fetch cache error for ${tableName}:`, error);
  }
}
