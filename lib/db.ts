import Dexie, { Table } from 'dexie';

// --- BASE INTERFACE ---
export interface Syncable {
  id: string; // UUID generated client-side
  syncStatus: 'synced' | 'pending' | 'updated' | 'deleted';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// --- ENTITY INTERFACES ---
export interface Employee extends Syncable {
  name: string;
  role?: string;
  phone?: string;
  isActive: boolean;
}

export interface Task extends Syncable {
  title: string;
  description?: string;
  assignedTo: string;
  dueDate?: string;
  priority?: string;
  category?: string;
  status: string;
}

export interface Crop extends Syncable {
  plot_number: string;
  crop_type: string;
  status: string;
  location: string;
  variety?: string;
  planting_date: string;
  expected_harvest_date?: string;
  plot_size_acres?: number;
  estimated_yield_kg?: number;
  actual_yield_kg?: number;
  harvest_notes?: string;
}

export interface InventoryItem extends Syncable {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  unitPrice: number;
  supplier?: string;
}

export interface Sale extends Syncable {
  date: string;
  customer?: string;
  amount?: number;
  contact_info?: string;
  itemsData?: any[]; // JSON array
}

export interface Expense extends Syncable {
  title: string;
  category: string;
  date: string;
  amount?: number;
  notes?: string;
}

export interface Livestock extends Syncable {
  animal_id: string;
  species: string;
  breed?: string;
  sex?: string;
  date_of_birth?: string;
  current_weight_kg?: number;
  health_status: string;
}

export interface LivestockLog extends Syncable {
  livestock_id: string;
  type: string;
  date: string;
  data: any; // JSON object for details
}

export interface Treatment extends Syncable {
  crop_id: string;
  treatment_type: string;
  product_name: string;
  treatment_date: string;
  quantity?: string;
  cost?: number;
  notes?: string;
}

export interface FieldScouting extends Syncable {
  crop_id?: string;
  field_name: string;
  scout_date: string;
  crop_stage?: string;
  issue_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  latitude?: number;
  longitude?: number;
  notes?: string;
  recommendation?: string;
  status: 'open' | 'monitoring' | 'resolved';
}

export interface Attachment extends Syncable {
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  url?: string;
  data_url?: string;
  notes?: string;
}

export interface SyncConflict {
  id: string;
  table_name: string;
  record_id: string;
  local_data: any;
  server_data?: any;
  reason: string;
  status: 'open' | 'resolved' | 'ignored';
  createdAt: string;
  updatedAt: string;
}

// --- DATABASE CLASS ---
export class FarmDatabase extends Dexie {
  employees!: Table<Employee, string>;
  tasks!: Table<Task, string>;
  crops!: Table<Crop, string>;
  inventory!: Table<InventoryItem, string>;
  sales!: Table<Sale, string>;
  expenses!: Table<Expense, string>;
  livestock!: Table<Livestock, string>;
  livestock_logs!: Table<LivestockLog, string>;
  treatments!: Table<Treatment, string>;
  scouting!: Table<FieldScouting, string>;
  attachments!: Table<Attachment, string>;
  sync_conflicts!: Table<SyncConflict, string>;

  constructor() {
    // CHANGED NAME TO 'HughesFarmDB_v2' TO FORCE RESET
    super('HughesFarmDB_v2');

    this.version(1).stores({
      employees: 'id, name, role, phone, isActive, syncStatus, createdAt, updatedAt',
      tasks: 'id, title, status, priority, assignedTo, dueDate, syncStatus, createdAt, updatedAt',
      crops: 'id, plot_number, crop_type, status, location, planting_date, syncStatus, createdAt, updatedAt',
      inventory: 'id, name, category, quantity, lowStockThreshold, syncStatus, createdAt, updatedAt',
      sales: 'id, date, customer, amount, syncStatus, createdAt, updatedAt',
      expenses: 'id, title, category, date, amount, syncStatus, createdAt, updatedAt',
      livestock: 'id, animal_id, species, health_status, syncStatus, createdAt, updatedAt',
      livestock_logs: 'id, livestock_id, type, date, syncStatus, createdAt, updatedAt',
      treatments: 'id, crop_id, treatment_date, syncStatus, createdAt, updatedAt',
    });

    this.version(2).stores({
      employees: 'id, name, role, phone, isActive, syncStatus, createdAt, updatedAt',
      tasks: 'id, title, status, priority, assignedTo, dueDate, syncStatus, createdAt, updatedAt',
      crops: 'id, plot_number, crop_type, status, location, planting_date, syncStatus, createdAt, updatedAt',
      inventory: 'id, name, category, quantity, lowStockThreshold, syncStatus, createdAt, updatedAt',
      sales: 'id, date, customer, amount, syncStatus, createdAt, updatedAt',
      expenses: 'id, title, category, date, amount, syncStatus, createdAt, updatedAt',
      livestock: 'id, animal_id, species, health_status, syncStatus, createdAt, updatedAt',
      livestock_logs: 'id, livestock_id, type, date, syncStatus, createdAt, updatedAt',
      treatments: 'id, crop_id, treatment_date, syncStatus, createdAt, updatedAt',
      scouting: 'id, field_name, scout_date, severity, status, syncStatus, createdAt, updatedAt',
      attachments: 'id, entity_type, entity_id, file_name, syncStatus, createdAt, updatedAt',
      sync_conflicts: 'id, table_name, record_id, status, createdAt, updatedAt',
    });
  }
}

// --- SINGLETON EXPORT ---
export const db = new FarmDatabase();
