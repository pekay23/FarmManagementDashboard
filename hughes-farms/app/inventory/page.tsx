// app/inventory/page.tsx
'use client';

import { useState } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, Search, Filter, X } from 'lucide-react';

// Mock Data (Matches IMG_4186)
const initialInventory = [
  { id: 1, name: 'Maize Seeds (Abontem)', category: 'Seeds', quantity: 25, unit: 'kg', threshold: 10, price: 8.50, supplier: 'AgriSeeds Ghana Ltd' },
  { id: 2, name: 'Fertilizer 15-15-15', category: 'Fertilizers', quantity: 8, unit: '50kg bags', threshold: 15, price: 150.00, supplier: 'Yara Ghana' },
  { id: 3, name: 'Neem Oil', category: 'Pesticides', quantity: 12, unit: 'liters', threshold: 5, price: 22.50, supplier: 'BioControl Ghana' },
  { id: 4, name: 'Poultry Feed', category: 'Feeds', quantity: 3, unit: '50kg bags', threshold: 10, price: 95.00, supplier: 'Feed Master Ltd' },
  { id: 5, name: 'Antibiotic (Oxytetracycline)', category: 'Medicines', quantity: 15, unit: 'vials', threshold: 8, price: 12.00, supplier: 'VetCare Ghana' },
];

const categories = ['All', 'Seeds', 'Fertilizers', 'Pesticides', 'Feeds', 'Medicines', 'Low Stock'];

export default function Inventory() {
  const [items, setItems] = useState(initialInventory);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter Logic
  const filteredItems = items.filter(item => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Low Stock') return item.quantity <= item.threshold;
    return item.category === activeCategory;
  });

  // Calculate KPIs
  const lowStockCount = items.filter(i => i.quantity <= i.threshold).length;
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Track your farm supplies and materials</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
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

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${activeCategory === cat 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-700">Low Stock Alert</h3>
            <p className="text-sm text-red-600">{lowStockCount} item(s) are running low. Consider restocking soon.</p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.threshold;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.supplier}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-800">{item.quantity} {item.unit}</td>
                    <td className="p-4 text-gray-500 text-sm">{item.threshold} {item.unit}</td>
                    <td className="p-4 text-gray-600">GH₵ {item.price.toFixed(2)}</td>
                    <td className="p-4 font-medium text-gray-800">GH₵ {(item.quantity * item.price).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Add New Inventory Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="e.g. Maize Seeds" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none bg-white">
                  <option>Select Category</option>
                  <option>Seeds</option>
                  <option>Fertilizers</option>
                  <option>Pesticides</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none" placeholder="kg, liters" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Threshold</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (GH₵)</label>
                  <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (Optional)</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple KPI Component
function InventoryKpi({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600"
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );
}
