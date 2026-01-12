// app/sales/page.tsx
'use client';

import { useState } from 'react';
import { ShoppingCart, DollarSign, Calendar, TrendingUp, Plus, X, FileText, Trash2 } from 'lucide-react';

// Mock Data (Matches IMG_4189)
const initialSales = [
  { id: 1, buyer: 'Grace Osei', contact: '+233 26 234 5678', date: 'Mar 08, 2024', items: 'Goat Milk (20x)', total: 64.00, status: 'completed' },
  { id: 2, buyer: 'Kofi Asante Market', contact: '+233 24 567 8901', date: 'Mar 10, 2024', items: 'Fresh Maize (100x)', total: 132.00, status: 'completed' },
  { id: 3, buyer: 'Akosua Mensah', contact: '+233 20 987 6543', date: 'Mar 15, 2024', items: 'Fresh Tomatoes (50x), Green Pepper (10x)', total: 152.30, status: 'completed' },
];

export default function SalesReceipts() {
  const [sales, setSales] = useState(initialSales);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [cartItems, setCartItems] = useState([{ id: 1, name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const tax = 0; // Set tax logic if needed
  const total = subtotal + tax;

  const addItem = () => {
    setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]);
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: string, value: any) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Receipts</h1>
          <p className="text-gray-500">Record sales and generate professional receipts</p>
        </div>
        <div className="flex gap-3">
            <button className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Receipt Settings
            </button>
            <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
            <Plus className="w-5 h-5" />
            New Sale
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Sales" value="3" icon={ShoppingCart} color="blue" />
        <KpiCard title="This Month" value="0" icon={Calendar} color="green" />
        <KpiCard title="Total Revenue" value="GH₵ 348.30" icon={DollarSign} color="purple" />
        <KpiCard title="Avg Sale" value="GH₵ 116.10" icon={TrendingUp} color="orange" />
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">Recent Sales</h3>
            <input type="text" placeholder="Search sales..." className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Buyer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-600 text-sm">{sale.date}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{sale.buyer}</div>
                    <div className="text-xs text-gray-500">{sale.contact}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{sale.items}</td>
                  <td className="p-4 font-bold text-gray-800">GH₵ {sale.total.toFixed(2)}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                      {sale.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-end gap-1 ml-auto">
                        <FileText className="w-4 h-4" /> View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record New Sale */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record New Sale</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Buyer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" 
                        placeholder="Buyer Name" 
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                    />
                    <input type="text" placeholder="Contact (Phone/Email)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                </div>

                {/* Inventory Toggle */}
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="inventory" className="w-4 h-4 text-green-600 rounded focus:ring-green-500" defaultChecked />
                    <label htmlFor="inventory" className="text-sm text-gray-700 font-medium">Sell from inventory (auto-deduct quantities)</label>
                </div>

                {/* Dynamic Items List */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-700">Sale Items</label>
                        <button onClick={addItem} className="text-sm text-green-600 font-medium hover:text-green-700 flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                    </div>
                    
                    {cartItems.map((item, index) => (
                        <div key={item.id} className="flex gap-2 items-center">
                            <input 
                                type="text" 
                                placeholder="Item Name" 
                                className="flex-[2] border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                value={item.name}
                                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            />
                            <input 
                                type="number" 
                                placeholder="Qty" 
                                className="w-16 border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value))}
                            />
                            <input 
                                type="number" 
                                placeholder="Price" 
                                className="w-24 border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                value={item.price || ''}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                            />
                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Quick Add Buttons (IMG_4191) */}
                <div>
                    <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Quick Add from Inventory:</p>
                    <div className="flex flex-wrap gap-2">
                        {['Maize Seeds', 'NPK Fertilizer', 'Neem Oil'].map(i => (
                            <button key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full hover:bg-blue-100 transition-colors">
                                {i}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal:</span>
                        <span>GH₵ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Tax (0%):</span>
                        <span>GH₵ {tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2 mt-2">
                        <span>Total:</span>
                        <span>GH₵ {total.toFixed(2)}</span>
                    </div>
                </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 rounded-b-xl">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-green-200">Record Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helper Components ---
function KpiCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600"
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
