import Dexie, { Table } from 'dexie';

// --- Interfaces ---
export interface InventoryItem { id?: number; item_name: string; category: string; quantity: number; unit: string; min_threshold: number; unit_price: number; supplier: string; last_updated: string; sync_status?: string; sync_id?: string; }

export interface Crop { 
  id?: number; 
  plot_number: string; 
  crop_type: string; 
  variety: string; 
  planting_date: string; 
  expected_harvest_date: string; 
  plot_size_acres: number; 
  location: string; 
  estimated_yield_kg: number; 
  actual_yield_kg?: number; 
  harvest_notes?: string; 
  status: string; 
  sync_status?: string; 
  sync_id?: string; 
}

export interface CropTreatment { 
  id?: number; 
  crop_local_id: number; 
  treatment_type: string; 
  product_name: string; 
  treatment_date: string; 
  quantity: string; 
  cost: number; 
  notes: string; 
  sync_status?: string; 
  sync_id?: string; 
}

export interface Livestock { id?: number; animal_id: string; species: string; breed: string; xes: string; current_weight_kg: number; date_of_birth: string; health_status: string; sync_status?: string; sync_id?: string; }
export interface Sale { id?: number; buyer_name: string; total_amount: number; sale_date: string; items_snapshot?: any[]; sync_status?: string; sync_id?: string; }
export interface Task { id?: number; title: string; due_date: string; status: string; priority?: string; assigned_to?: string; sync_status?: string; sync_id?: string; }
export interface Log { id?: number; type: string; livestock_id: number; date?: string; sync_status?: string; sync_id?: string; [key: string]: any; }
export interface Employee { id?: number; name: string; role: string; sync_status?: string; sync_id?: string; }

class FarmDatabase extends Dexie {
  inventory!: Table<InventoryItem>;
  crops!: Table<Crop>;
  crop_treatments!: Table<CropTreatment>; // <--- ADDED THIS
  livestock!: Table<Livestock>;
  sales!: Table<Sale>;
  tasks!: Table<Task>;
  logs!: Table<Log>;
  employees!: Table<Employee>;

  constructor() {
    super('FarmDB');
    
    // Define tables and indexes
    this.version(1).stores({
      inventory: '++id, item_name, category, sync_status',
      crops: '++id, crop_type, status, planting_date, expected_harvest_date, sync_status',
      crop_treatments: '++id, crop_local_id, treatment_date, sync_status', // <--- ADDED THIS
      livestock: '++id, animal_id, species, health_status, sync_status',
      sales: '++id, buyer_name, sale_date, sync_status',
      tasks: '++id, title, status, due_date, sync_status',
      logs: '++id, livestock_id, type, date, sync_status',
      employees: '++id, name, role, sync_status'
    });
  }
}

export const db = new FarmDatabase();
