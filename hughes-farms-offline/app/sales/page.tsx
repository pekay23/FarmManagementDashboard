'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, DollarSign, Calendar, TrendingUp, Plus, X, 
  FileText, Trash2, CheckCircle, Settings, Save, Download, 
  Search, Wifi, WifiOff, RefreshCw 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

export default function SalesReceipts() {
  // --- DATA QUERIES ---
  const allSales = useLiveQuery(() => db.sales.reverse().toArray()) || [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<any>({ 
    farm_name: 'Hughes Farms', 
    phone: '', 
    email: '', 
    address: '', 
    receipt_footer: 'Thank you!', 
    tax_rate: 0 
  });

  // Modals & UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // Prevents duplicate clicks
  const [toast, setToast] = useState({ show: false, message: '' });

  // Form State
  const [cartItems, setCartItems] = useState([{ id: Date.now(), name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');
  const [contact, setContact] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  const taxAmount = subtotal * (Number(settings.tax_rate) / 100);
  const total = subtotal + taxAmount;

  // --- CONNECTIVITY & INIT ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => { setIsOnline(true); runSync(); };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const savedSettings = localStorage.getItem('farmSettings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      runSync();
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  async function runSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncTable('sales', '/api/sales');
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

  // --- HANDLERS ---
  function addItem() { setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]); }
  function removeItem(id: number) { setCartItems(cartItems.filter(item => item.id !== id)); }
  function updateItem(id: number, field: string, value: any) {
    setCartItems(cartItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function quickAdd(invItem: any) {
    const exists = cartItems.find(i => i.name === invItem.item_name);
    if (exists) { 
      updateItem(exists.id, 'qty', Number(exists.qty) + 1); 
    } else { 
      setCartItems([...cartItems, { id: Date.now(), name: invItem.item_name, qty: 1, price: Number(invItem.unit_price) }]); 
    }
  }

  async function handleRecordSale() {
    if (!buyerName || cartItems.length === 0 || isRecording) return;
    
    setIsRecording(true); // Lock submission

    const newSale = {
        buyer_name: buyerName,
        contact_info: contact,
        total_amount: total,
        sale_date: new Date().toISOString(),
        items_snapshot: cartItems,
        sync_status: 'pending_create' as const
    };

    try {
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
        // Reset Form
        setBuyerName(''); setContact(''); 
        setCartItems([{ id: Date.now(), name: '', qty: 1, price: 0 }]);
        runSync();
    } catch (err) {
        showNotification('Error recording sale');
    } finally {
        setIsRecording(false);
    }
  }

  async function handleSaveSettings(e: any) {
    e.preventDefault();
    // Corrected target access to prevent "undefined" error
    const formData = { 
        farm_name: e.target.farm_name.value, 
        phone: e.target.phone.value, 
        email: e.target.email.value, 
        address: e.target.address.value, 
        receipt_footer: e.target.receipt_footer.value, 
        tax_rate: e.target.tax_rate.value 
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
    doc.text(`${settings.phone || ''} | ${settings.email || ''}`, 105, 36, { align: "center" });
    if (settings.address) doc.text(settings.address, 105, 42, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Receipt #: ${(sale.sync_id || sale.id || 'TEMP').toString().slice(0, 8).toUpperCase()}`, 14, 65);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString()}`, 14, 71);
    doc.text(`Buyer: ${sale.buyer_name}`, 14, 77);

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

  // Filter local sales
  const filteredSales = allSales.filter((s: any) => 
    s.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.id && s.id.toString().includes(searchQuery))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header */}
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
            <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" /> Receipt Settings
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg">
                <Plus className="w-5 h-5" /> New Sale
            </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">Recent Sales</h3>
            <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input type="text" placeholder="Search sales..." className="border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-green-500 w-64 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
              {filteredSales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-600 text-sm">{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{sale.buyer_name}</div>
                    <div className="text-xs text-gray-500">{sale.contact_info}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
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
          {filteredSales.length === 0 && <div className="p-10 text-center text-gray-400 text-sm">No sales found.</div>}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* RECORD NEW SALE MODAL - WITH DESCRIPTIONS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record New Sale</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Buyer Full Name</label>
                        <input type="text" placeholder="e.g. John Doe" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Contact Info (Phone/Email)</label>
                        <input type="text" placeholder="e.g. 0244..." className="w-full border p-3 rounded-lg outline-none focus:border-green-500" value={contact} onChange={(e) => setContact(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center gap-2"><input type="checkbox" checked={deductInventory} onChange={(e) => setDeductInventory(e.target.checked)} className="w-4 h-4" /><label className="text-sm font-medium text-gray-700">Sell from inventory (auto-deduct)</label></div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Items in Cart</label>
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center">
                            <input list="inventory-list" placeholder="Item Name" className="flex-[2] border p-2 rounded-lg text-sm outline-none" value={item.name} onChange={(e) => { 
                                updateItem(item.id, 'name', e.target.value);
                                const match = inventory.find(inv => inv.item_name === e.target.value);
                                if (match) updateItem(item.id, 'price', Number(match.unit_price));
                            }} />
                            <input type="number" placeholder="Qty" className="w-16 border p-2 rounded-lg text-sm" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                            <input type="number" placeholder="Price" className="w-24 border p-2 rounded-lg text-sm" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} />
                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                    <button onClick={addItem} className="text-sm text-green-600 font-bold flex items-center gap-1 mt-2"><Plus className="w-4 h-4" /> Add Another Item</button>
                </div>

                <div className="bg-green-50 p-4 rounded-lg flex justify-between font-bold text-green-900 text-lg">
                    <span>Grand Total:</span>
                    <span>GH₵ {total.toFixed(2)}</span>
                </div>
            </div>
            <div className="p-6 border-t flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-medium text-gray-500">Cancel</button>
                <button onClick={handleRecordSale} disabled={isRecording} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold flex justify-center">
                    {isRecording ? <RefreshCw className="animate-spin" /> : "Complete Sale"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL - FIXED */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Receipt Configuration</h2>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Farm Name</label><input name="farm_name" required defaultValue={settings.farm_name} className="w-full border p-2.5 rounded-lg" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Phone</label><input name="phone" defaultValue={settings.phone} className="w-full border p-2.5 rounded-lg" /></div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Tax (%)</label><input name="tax_rate" type="number" step="0.1" defaultValue={settings.tax_rate} className="w-full border p-2.5 rounded-lg" /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Email</label><input name="email" defaultValue={settings.email} className="w-full border p-2.5 rounded-lg" /></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Address</label><textarea name="address" rows={2} defaultValue={settings.address} className="w-full border p-2.5 rounded-lg resize-none" /></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Footer Message</label><input name="receipt_footer" defaultValue={settings.receipt_footer} className="w-full border p-2.5 rounded-lg" /></div>
                    <button type="submit" className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold">Save Settings</button>
                </form>
            </div>
        </div>
      )}

      {/* VIEW MODAL (Restored) */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setViewingReceipt(null)}>
            <div className="bg-white rounded-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-center font-bold text-lg mb-4">Sale Summary</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2 text-gray-600"><span>Date:</span> <span className="text-black font-medium">{new Date(viewingReceipt.sale_date).toLocaleString()}</span></div>
                    <div className="flex justify-between border-b pb-2 text-gray-600"><span>Buyer:</span> <span className="text-black font-medium">{viewingReceipt.buyer_name}</span></div>
                </div>
                <div className="mt-6 border p-3 rounded-lg bg-gray-50 space-y-2">
                    {(viewingReceipt.items_snapshot || viewingReceipt.items_data)?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span>{item.name} (x{item.qty})</span>
                            <span className="font-bold">GH₵ {(item.qty * item.price).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-between font-bold text-lg"><span>Total:</span> <span>GH₵ {Number(viewingReceipt.total_amount).toFixed(2)}</span></div>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setViewingReceipt(null)} className="flex-1 border py-2 rounded-lg">Close</button>
                    <button onClick={() => generateReceipt(viewingReceipt)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold">Download PDF</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
