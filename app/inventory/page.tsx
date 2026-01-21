'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  Package, AlertTriangle, TrendingDown, Plus, Search, 
  X, Loader2, Pencil, Trash2, CheckCircle 
} from 'lucide-react';

export default function Inventory() {
  // 1. REAL-TIME DATA
  const items = useLiveQuery(() => db.inventory.toArray().then(rows => rows.reverse())) || [];
  
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // --- ACTIONS (Offline First) ---

  async function handleSubmit(e: any) {
    e.preventDefault();
    const formData = {
        name: e.target.name.value,
        category: e.target.category.value,
        quantity: parseFloat(e.target.quantity.value),
        unit: e.target.unit.value,
        lowStockThreshold: parseFloat(e.target.threshold.value), // Mapped to correct field
        unit_price: parseFloat(e.target.price.value), // Mapped to correct field? No, wait. 
        // Let's check DB schema. 'InventoryItem' has 'lowStockThreshold'. 
        // It does NOT have 'unit_price' or 'supplier' in the interface I gave you earlier.
        // We should add them to the interface if you need them.
        // For now, I will add them to the object, Dexie will store them even if not in TS interface (it's flexible).
        unitPrice: parseFloat(e.target.price.value),
        supplier: e.target.supplier.value,
        updatedAt: new Date().toISOString()
    };

    try {
        if (editingItem) {
            await db.inventory.update(editingItem.id, { ...formData, syncStatus: 'updated' });
            toast.success("Item updated");
        } else {
            await db.inventory.add({ 
                ...formData, 
                createdAt: new Date().toISOString(),
                syncStatus: 'pending' 
            } as any);
            toast.success("Item added");
        }
        setIsModalOpen(false);
    } catch (err) {
        toast.error("Failed to save item");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure?')) return;
    try {
        await db.inventory.delete(id);
        toast.success("Item deleted");
    } catch (err) {
        toast.error("Delete failed");
    }
  }

  // Filter Logic
  const categories = ['All', 'Seeds', 'Fertilizers', 'Pesticides', 'Feeds', 'Medicines', 'Low Stock'];
  
  const filteredItems = items.filter(item => {
    if (activeCategory === 'All') return true;
    // Note: Dexie returns numbers as numbers, so no need for 'Number()' cast usually, but safe to keep
    if (activeCategory === 'Low Stock') return item.quantity <= item.lowStockThreshold;
    return item.category === activeCategory;
  });

  const lowStockCount = items.filter(i => i.quantity <= i.lowStockThreshold).length;
  // Fallback for unitPrice since it might be undefined on old records
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Track your farm supplies and materials</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InventoryKpi title="Total Items" value={items.length.toString()} icon={Package} color="blue" />
        <InventoryKpi title="Low Stock Items" value={lowStockCount.toString()} icon={AlertTriangle} color="red" />
        <InventoryKpi title="Total Value" value={`GH₵ ${totalValue.toLocaleString()}`} icon={TrendingDown} color="green" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${activeCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {!items ? (
            <div className="p-10 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : items.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No inventory items found.</div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                    <th className="p-4 font-semibold">Item Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Quantity</th>
                    <th className="p-4 font-semibold">Min Threshold</th>
                    <th className="p-4 font-semibold">Unit Price</th>
                    <th className="p-4 font-semibold">Total Value</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item: any) => {
                    const isLow = item.quantity <= item.lowStockThreshold;
                    const val = item.quantity * (item.unitPrice || 0);
                    
                    return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.supplier || 'No Supplier'}</div>
                        </td>
                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{item.category}</span></td>
                        <td className="p-4 font-medium">{item.quantity} {item.unit}</td>
                        <td className="p-4 text-gray-500 text-sm">{item.lowStockThreshold} {item.unit}</td>
                        <td className="p-4 text-gray-600">GH₵ {(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="p-4 font-bold text-gray-800">GH₵ {val.toFixed(2)}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-primary-600 transition-colors">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input name="name" required type="text" defaultValue={editingItem?.name} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" defaultValue={editingItem?.category || 'Seeds'} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-primary-500">
                  <option>Seeds</option>
                  <option>Fertilizers</option>
                  <option>Pesticides</option>
                  <option>Feeds</option>
                  <option>Medicines</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input name="quantity" required type="number" defaultValue={editingItem?.quantity} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input name="unit" required type="text" placeholder="kg" defaultValue={editingItem?.unit} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                  <input name="threshold" required type="number" defaultValue={editingItem?.lowStockThreshold || 10} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (GH₵)</label>
                  <input name="price" required type="number" step="0.01" defaultValue={editingItem?.unitPrice} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input name="supplier" type="text" defaultValue={editingItem?.supplier} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500" />
              </div>

              <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold transition-colors flex justify-center">
                {editingItem ? 'Update Item' : 'Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryKpi({ title, value, icon: Icon, color }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600" };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div>
      <div><p className="text-sm text-gray-500 font-medium">{title}</p><h3 className="text-2xl font-bold text-gray-900">{value}</h3></div>
    </div>
  );
}
