import Dexie, { Table } from 'dexie';

// 1. Base interface
export interface Syncable {
  id?: number;
  syncStatus: 'synced' | 'pending' | 'updated';
  createdAt?: string;
  updatedAt?: string;
}

// 2. New Expense Interface
export interface Expense extends Syncable {
  title: string;
  amount: number;
  category: 'Seeds' | 'Fertilizer' | 'Labor' | 'Fuel' | 'Maintenance' | 'Other';
  date: string;
  notes?: string;
}

// ... (Keep existing interfaces for Crop, Livestock, etc.) ...
export interface Crop extends Syncable {
  plot_number: string;
  crop_type: string;
  variety?: string;
  planting_date: string;
  expected_harvest_date?: string;
  plot_size_acres: number;
  location: string;
  estimated_yield_kg: number;
  actual_yield_kg?: number;
  harvest_notes?: string;
  status: 'Planted' | 'Growing' | 'Harvested' | 'Failed';
}

export interface Livestock extends Syncable {
  animal_id: string;       
  species: string;         
  breed: string;
  sex: 'Male' | 'Female';  
  date_of_birth: string;   
  current_weight_kg: number; 
  health_status: 'Healthy' | 'Sick' | 'Sold' | 'Deceased'; 
}

export interface LivestockLog extends Syncable {
  livestock_id: number;
  type: 'vaccine' | 'treatment' | 'weight';
  date: string;
  data: any;
  notes?: string;
}

export interface InventoryItem extends Syncable {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  unitPrice?: number; 
  supplier?: string;  
}

export interface Task extends Syncable {
  title: string;
  description?: string;
  assignedTo?: string; 
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
}

export interface Sale extends Syncable {
  customer: string; // Changed from 'buyer_name' to standardize
  amount: number;   // Changed from 'total_amount'
  date: string;
  itemsData: any[]; // Store the items JSON
  contact_info?: string;
}

export interface Employee extends Syncable {
  name: string;
  role: string;
  phone?: string;
  isActive: boolean;
}

export interface Treatment extends Syncable {
  crop_id: number;
  treatment_type: string;
  product_name: string;
  treatment_date: string;
  quantity: string;
  cost: number;
  notes?: string;
}

// 3. Database Class
class FarmDatabase extends Dexie {
  livestock!: Table<Livestock>;
  livestock_logs!: Table<LivestockLog>;
  crops!: Table<Crop>;
  inventory!: Table<InventoryItem>;
  tasks!: Table<Task>;
  sales!: Table<Sale>;
  employees!: Table<Employee>;
  treatments!: Table<Treatment>;
  expenses!: Table<Expense>; // <--- New Table

  constructor() {
    super('HughesFarmDB');
    this.version(1).stores({
      livestock: '++id, animal_id, species, health_status, syncStatus',
      livestock_logs: '++id, livestock_id, type, date, syncStatus',
      crops: '++id, plot_number, crop_type, status, location, syncStatus',
      inventory: '++id, name, category, quantity, syncStatus',
      tasks: '++id, status, priority, assignedTo, syncStatus',
      sales: '++id, date, syncStatus',
      employees: '++id, name, isActive, syncStatus',
      treatments: '++id, crop_id, treatment_date, syncStatus',
      expenses: '++id, category, date, syncStatus' // <--- New Schema
    });
  }
}

export const db = new FarmDatabase();
