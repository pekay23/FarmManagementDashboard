import { db } from './dbLocal';

export async function syncTable(tableName: string, apiEndpoint: string) {
  // @ts-ignore
  const table = db[tableName];
  if (!table) return;

  try {
    // 1. PUSH: Send local changes to server
    const pending = await table.where('sync_status').startsWith('pending').toArray();
    for (const item of pending) {
      const { id, sync_status, sync_id, ...data } = item;
      const method = sync_status === 'pending_create' ? 'POST' : 'PUT';
      const url = sync_status === 'pending_create' ? apiEndpoint : `${apiEndpoint}/${sync_id || id}`;

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const serverData = await res.json();
          // Update local record with server ID and mark as synced
          await table.update(id, { ...serverData, sync_id: serverData.id, sync_status: 'synced' });
        }
      } catch (err) { console.error(`Sync push failed for ${tableName}`, err); }
    }
  } catch (error) { console.error(`Sync error for ${tableName}:`, error); }
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
      // Use put (upsert) instead of bulkAdd to prevent "Key already exists" error
      await db.transaction('rw', table, async () => {
        for (const item of serverData) {
          // Check if we have this item locally already (via sync_id)
          const localMatch = await table.where('sync_id').equals(item.id).first();
          
          if (!localMatch) {
            // New item from server
            await table.put({ ...item, sync_id: item.id, sync_status: 'synced' });
          } else if (localMatch.sync_status === 'synced') {
            // Server version is master, update local
            await table.update(localMatch.id, { ...item, sync_status: 'synced' });
          }
          // If localMatch.sync_status is 'pending...', we DON'T overwrite it 
          // because the user has unsaved local changes.
        }
      });
    }
  } catch (error) { console.error(`Fetch error for ${tableName}:`, error); }
}
