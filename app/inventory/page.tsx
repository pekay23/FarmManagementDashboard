'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, Search, X, Loader2, Pencil, Trash2 } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // New: Tracks item being edited

  // FETCH DATA
  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setIsLoading(false);
    }
  }

  // OPEN MODAL (ADD MODE)
  function openAddModal() {
    setEditingItem(null); // Clear editing state
    setIsModalOpen(true);
  }

  // OPEN MODAL (EDIT MODE)
  function openEditModal(item: any) {
    setEditingItem(item); // Set the item we are editing
    setIsModalOpen(true);
  }

  // HANDLE DELETE
  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    // Optimistic UI update (remove immediately)
    setItems(items.filter(i => i.id !== id));

    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Failed to delete", error);
      fetchInventory(); // Revert on error
    }
  }

  // HANDLE FORM SUBMIT (ADD OR EDIT)
  async function handleSubmit(e: any) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = {
      name: e.target.name.value,
      category: e.target.category.value,
      quantity: parseFloat(e.target.quantity.value),
      unit: e.target.unit.value,
      threshold: parseFloat(e.target.threshold.value),
      price: parseFloat(e.target.price.value),
      supplier: e.target.supplier.value
    };

    try {
      let res;
      if (editingItem) {
        // EDIT MODE (PUT)
        res = await fetch(`/api/inventory/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // ADD MODE (POST)
        res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (res.ok) {
        const savedItem = await res.json();
        if (editingItem) {
            // Update item in list
            setItems(items.map(i => i.id === savedItem.id ? savedItem : i));
        } else {
            // Add new item to list
            setItems([savedItem, ...items]);
        }
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to save item", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter Logic
  const categories = ['All', 'Seeds', 'Fertilizers', 'Pesticides', 'Feeds', 'Medicines', 'Low Stock'];
  const filteredItems = items.filter(item => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Low Stock') return Number(item.quantity) <= Number(item.min_threshold);
    return item.category === activeCategory;
  });

  const lowStockCount = items.filter(i => Number(i.quantity) <= Number(i.min_threshold)).length;
  const totalValue = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Track your farm supplies and materials</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Item
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
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${activeCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
            <div className="p-10 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                    <th className="p-4 font-semibold">Item Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Quantity</th>
                    <th className="p-4 font-semibold">Value</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item: any) => {
                    const isLow = Number(item.quantity) <= Number(item.min_threshold);
                    return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                        <div className="text-xs text-gray-500">{item.supplier || 'No Supplier'}</div>
                        </td>
                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{item.category}</span></td>
                        <td className="p-4 font-medium">{item.quantity} {item.unit}</td>
                        <td className="p-4 text-gray-600">GH₵ {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => openEditModal(item)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors">
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input name="name" required type="text" defaultValue={editingItem?.item_name} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" defaultValue={editingItem?.category || 'Seeds'} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-green-500">
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
                  <input name="quantity" required type="number" defaultValue={editingItem?.quantity} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input name="unit" required type="text" placeholder="kg" defaultValue={editingItem?.unit} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                  <input name="threshold" required type="number" defaultValue={editingItem?.min_threshold || 10} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (GH₵)</label>
                  <input name="price" required type="number" step="0.01" defaultValue={editingItem?.unit_price} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input name="supplier" type="text" defaultValue={editingItem?.supplier} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500" />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors flex justify-center">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (editingItem ? 'Update Item' : 'Save Item')}
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
