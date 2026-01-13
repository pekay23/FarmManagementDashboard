'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, DollarSign, Calendar, TrendingUp, Plus, X, 
  FileText, Trash2, CheckCircle, Settings, Save, Download, 
  Search, Wifi, WifiOff, RefreshCw 
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Ensure these imports exist in your project ---
import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

export default function SalesReceipts() {
  // --- OFFLINE DATA ---
  // We use liveQuery to watch the local Dexie DB. 
  // The "|| []" ensures we never map over null/undefined.
  const allSales = useLiveQuery(() => db.sales.toArray())?.reverse() || [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');

  // Cast sale to 'any' here if needed, but usually safe on the prop access
  const filteredSales = allSales.filter((s: any) => 
    s.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.id && s.id.toString().includes(searchQuery))
  );

  const [settings, setSettings] = useState<any>({ 
    farm_name: 'Hughes Farms', 
    phone: '', 
    email: '', 
    address: '', 
    receipt_footer: 'Thank you!', 
    tax_rate: 0 
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);

  // UI States
  // Initialize as true to match server render, update in useEffect
  const [isOnline, setIsOnline] = useState(true); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Form State
  const [cartItems, setCartItems] = useState([{ id: 1, name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');
  const [contact, setContact] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  const taxAmount = subtotal * (Number(settings.tax_rate) / 100);
  const total = subtotal + taxAmount;

  useEffect(() => {
    // 1. Check connectivity safely on client mount
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => { setIsOnline(true); runSync(); };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 2. Load settings
      const savedSettings = localStorage.getItem('farmSettings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      // 3. Initial Sync
      runSync();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  async function runSync() {
    // Only sync if we are in the browser and online
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    
    setIsSyncing(true);
    try {
      await syncTable('sales', '/api/sales');
      // Fetch latest data to cache locally
      await fetchAndCache('sales', '/api/sales');
      await fetchAndCache('inventory', '/api/inventory');
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  function addItem() { 
    setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]); 
  }

  function removeItem(id: number) { 
    setCartItems(cartItems.filter(item => item.id !== id)); 
  }

  function updateItem(id: number, field: string, value: any) {
    setCartItems(cartItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function quickAdd(invItem: any) {
    const exists = cartItems.find(i => i.name === invItem.item_name);
    if (exists) { 
      updateItem(exists.id, 'qty', Number(exists.qty) + 1); 
    } else { 
      setCartItems([...cartItems, { 
        id: Date.now(), 
        name: invItem.item_name, 
        qty: 1, 
        price: Number(invItem.unit_price) 
      }]); 
    }
  }

  async function handleRecordSale() {
    if (!buyerName || cartItems.length === 0) return;

    const newSale = {
        buyer_name: buyerName,
        contact_info: contact,
        total_amount: total,
        sale_date: new Date().toISOString(),
        items_snapshot: cartItems, // This is saved locally
        sync_status: 'pending_create' as const
    };

    // 'as any' bypasses strict type checks on insertion
    await db.sales.add(newSale as any);

    if (deductInventory) {
        for (const item of cartItems) {
            const invItem = inventory.find(i => i.item_name === item.name);
            if (invItem && invItem.id) {
                await db.inventory.update(invItem.id, { 
                    quantity: invItem.quantity - Number(item.qty), 
                    sync_status: 'pending_update' 
                });
            }
        }
    }

    setIsModalOpen(false);
    showNotification('Sale recorded locally');
    setBuyerName(''); 
    setContact(''); 
    setCartItems([{ id: Date.now(), name: '', qty: 1, price: 0 }]);
    
    // Attempt to sync immediately
    runSync();
  }

  async function handleSaveSettings(e: any) {
    e.preventDefault();
    const formData = { 
        farm_name: e.target.farm_name.value, 
        phone: e.target.phone.value, 
        email: e.target.email.value, 
        address: e.target.address.value, 
        receipt_footer: e.target.footer.value, 
        tax_rate: e.target.tax.value 
    };
    setSettings(formData);
    localStorage.setItem('farmSettings', JSON.stringify(formData));
    setIsSettingsOpen(false);
    showNotification('Settings saved locally');
  }

  async function generateReceipt(sale: any) {
    const doc = new jsPDF();
    const currency = "GHS";

    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 55, 'F'); 

    if (logoBase64) {
      const svgString = atob(logoBase64.split(',')[1]);
      await addSvgToPdf(doc, svgString, 15, 10, 35, 35);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(settings.farm_name, 105, 20, { align: "center" });

    doc.setFontSize(10);
    let contactLine = `${settings.phone || ''} | ${settings.email || ''}`;
    doc.text(contactLine, 105, 36, { align: "center" });
    if (settings.address) doc.text(settings.address, 105, 42, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Receipt #: ${(sale.sync_id || sale.id).toString().slice(0, 8).toUpperCase()}`, 14, 65);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString()}`, 14, 71);
    doc.text(`Buyer: ${sale.buyer_name}`, 14, 77);

    // FIXED: Handle both data sources safely
    const items = sale.items_snapshot || sale.items_data || [];

    autoTable(doc, {
        startY: 85,
        head: [['Item', 'Qty', 'Price', 'Total']],
        body: items.map((i: any) => [ i.name, i.qty, Number(i.price).toFixed(2), (i.qty * i.price).toFixed(2) ]),
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`TOTAL: ${currency} ${Number(sale.total_amount).toFixed(2)}`, 190, finalY, { align: "right" });

    if (settings.receipt_footer) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(settings.receipt_footer, 105, 280, { align: "center" });
    }

    doc.save(`Receipt_${sale.buyer_name}.pdf`);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-white" />
            <p className="text-sm">{toast.message}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Receipts</h1>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? 
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Wifi className="w-3 h-3"/> Online</span> : 
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3"/> Offline Mode</span>
            }
            {isSyncing && <span className="text-xs text-blue-500 flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Syncing...</span>}
          </div>
        </div>

        <div className="flex gap-3">
            <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 shadow-sm flex items-center gap-2">
                <Settings className="w-4 h-4" /> Receipt Settings
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-green-200">
                <Plus className="w-5 h-5" /> New Sale
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">Recent Sales</h3>
            <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input type="text" placeholder="Search sales..." className="border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Buyer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* FIXED: Added 'any' type to sale to bypass the items_data error */}
              {filteredSales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-600 text-sm">{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{sale.buyer_name}</div>
                    <div className="text-xs text-gray-500">{sale.contact_info}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    {/* Safe access to items_data or items_snapshot */}
                    {(sale.items_snapshot || sale.items_data)?.map((i: any) => `${i.name} (${i.qty})`).join(', ') || 'No items'}
                  </td>
                  <td className="p-4 font-bold text-gray-800">GH₵ {Number(sale.total_amount).toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setViewingReceipt(sale)} className="text-blue-600 hover:underline text-sm font-medium">View</button>
                    <span className="mx-2 text-gray-300">|</span>
                    <button onClick={() => generateReceipt(sale)} className="text-green-600 hover:underline text-sm font-medium">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Helper for empty state */}
          {filteredSales.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
                {allSales.length === 0 ? "No sales recorded yet." : "No sales match your search."}
            </div>
          )}
        </div>
      </div>
      
      {/* VIEW MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setViewingReceipt(null)}>
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-center font-bold text-lg mb-4">Sale Details</h3>
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Date:</span> <span>{new Date(viewingReceipt.sale_date).toLocaleString()}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Buyer:</span> <span>{viewingReceipt.buyer_name}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Contact:</span> <span>{viewingReceipt.contact_info || 'N/A'}</span></div>
                </div>
                <div className="mt-6">
                    <h4 className="font-bold mb-2">Items</h4>
                    <div className="space-y-2 border p-3 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                        {(viewingReceipt.items_snapshot || viewingReceipt.items_data)?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span>{item.name} (x{item.qty})</span>
                                <span className="font-medium">GH₵ {(item.qty * item.price).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between font-bold text-lg text-gray-900"><span>Total:</span> <span>GH₵ {Number(viewingReceipt.total_amount).toFixed(2)}</span></div>
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => setViewingReceipt(null)} className="flex-1 bg-gray-100 py-3 rounded-lg font-medium">Close</button>
                    <button onClick={() => generateReceipt(viewingReceipt)} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Receipt Configuration</h2>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label><input name="farm_name" required defaultValue={settings.farm_name} className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input name="phone" defaultValue={settings.phone} placeholder="+233..." className="w-full border p-2.5 rounded-lg outline-none" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label><input name="tax" type="number" step="0.1" defaultValue={settings.tax_rate} className="w-full border p-2.5 rounded-lg outline-none" /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input name="email" defaultValue={settings.email} className="w-full border p-2.5 rounded-lg outline-none" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea name="address" rows={2} defaultValue={settings.address} className="w-full border p-2.5 rounded-lg resize-none outline-none" /></div>
                    <button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"><Save className="w-4 h-4" /> Save Locally</button>
                </form>
            </div>
        </div>
      )}

      {/* NEW SALE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record New Sale</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Buyer Name" className="w-full border p-3 rounded-lg outline-none" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                    <input type="text" placeholder="Contact" className="w-full border p-3 rounded-lg outline-none" value={contact} onChange={(e) => setContact(e.target.value)} />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={deductInventory} onChange={(e) => setDeductInventory(e.target.checked)} className="w-4 h-4 text-green-600 rounded" /><label className="text-sm text-gray-700 font-medium">Sell from inventory</label></div>
                    {deductInventory && (<div className="p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Quick Add</p><div className="flex flex-wrap gap-2">{inventory.slice(0, 5).map(inv => (<button key={inv.id} onClick={() => quickAdd(inv)} className="px-3 py-1 bg-white text-blue-700 border border-blue-200 text-xs rounded-full hover:bg-blue-100 flex items-center gap-1"><Plus className="w-3 h-3" />{inv.item_name}</button>))}</div></div>)}
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold text-gray-700">Sale Items</label><button onClick={addItem} className="text-sm text-green-600 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Add Item</button></div>
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center">
                            <input list="inventory-list" type="text" placeholder="Item Name" className="flex-[2] border p-2 rounded-lg text-sm outline-none" value={item.name} onChange={(e) => { updateItem(item.id, 'name', e.target.value); const match = inventory.find(inv => inv.item_name === e.target.value); if (match) updateItem(item.id, 'price', Number(match.unit_price)); }} />
                            <datalist id="inventory-list">{inventory.map(inv => <option key={inv.id} value={inv.item_name} />)}</datalist>
                            <input type="number" placeholder="Qty" className="w-16 border p-2 rounded-lg text-sm outline-none" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                            <input type="number" placeholder="Price" className="w-24 border p-2 rounded-lg text-sm outline-none" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} />
                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between font-bold text-lg text-gray-900"><span>Total:</span><span>GH₵ {total.toFixed(2)}</span></div>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 rounded-b-xl">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium">Cancel</button>
                <button onClick={handleRecordSale} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold">Record Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
