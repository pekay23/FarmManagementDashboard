import Dexie, { Table } from 'dexie';

// Define the interface for our items
export interface InventoryItem {
  id?: number; // Local ID (auto-increment)
  sync_id?: string; // The Neon UUID (for syncing back)
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  unit_price: number;
  supplier?: string;
  sync_status: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
}

class FarmDatabase extends Dexie {
  inventory!: Table<InventoryItem>; 

  constructor() {
    super('HughesFarmsDB');
    
    // Define tables and indexes
    this.version(1).stores({
      inventory: '++id, sync_id, sync_status' 
      // We index sync_status so we can easily find items that need uploading
    });
  }
}

export const db = new FarmDatabase();
