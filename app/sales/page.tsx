'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  DollarSign, Plus, X, Trash2, CheckCircle, Settings, 
  Download, Search, Square, CheckSquare, AlertTriangle 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from "@/lib/logo";
import { addSvgToPdf } from '@/lib/pdfUtils';

export default function SalesReceipts() {
  // 1. REAL-TIME DATA
  const sales = useLiveQuery(() => db.sales.toArray().then(rows => rows.reverse())) || [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Changed to string array for UUIDs
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  
  // Settings - Initialize with defaults
  const [settings, setSettings] = useState<any>({ 
      farm_name: 'Hughes Farms', 
      phone: '', email: '', address: '', receipt_footer: 'Thank you!', tax_rate: 0 
  });

  // Cart State
  const [cartItems, setCartItems] = useState([{ id: 1, name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');
  const [contact, setContact] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  const taxAmount = subtotal * (Number(settings.tax_rate) / 100);
  const total = subtotal + taxAmount;

  // Filter Sales
  const filteredSales = sales.filter(s => 
    s.syncStatus !== 'deleted' && ( // Filter out logically deleted items
        s.customer?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.id?.toString().includes(searchQuery)
    )
  );

  // Load Settings (Client-Side Only)
  useEffect(() => {
      // Check if we are in the browser
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('farmSettings');
          if (saved) {
              try {
                  setSettings(JSON.parse(saved));
              } catch (e) {
                  console.error("Failed to parse settings", e);
              }
          }
      }
  }, []);

  // --- ACTIONS ---

  function toggleSelectAll() {
    if (selectedIds.length === filteredSales.length) {
        setSelectedIds([]); 
    } else {
        const ids = filteredSales.map(s => s.id).filter((id): id is string => id !== undefined);
        setSelectedIds(ids); 
    }
  }

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
        setSelectedIds([...selectedIds, id]);
    }
  }

  async function executeBulkDelete() {
    try {
        // Mark as deleted for sync or delete directly if pending
        await db.transaction('rw', db.sales, async () => {
            for (const id of selectedIds) {
                const sale = await db.sales.get(id);
                if (sale && sale.syncStatus === 'pending') {
                    await db.sales.delete(id);
                } else {
                    await db.sales.update(id, { syncStatus: 'deleted', updatedAt: new Date().toISOString() });
                }
            }
        });
        
        toast.success(`${selectedIds.length} sales deleted`);
        setSelectedIds([]);
        setIsDeleteModalOpen(false);
    } catch (e) {
        toast.error("Error deleting sales");
    }
  }

  // Cart Logic
  function addItem() { setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]); }
  function removeItem(id: number) { setCartItems(cartItems.filter(item => item.id !== id)); }
  function updateItem(id: number, field: string, value: any) { 
      setCartItems(cartItems.map(item => item.id === id ? { ...item, [field]: value } : item)); 
  }
  
  function quickAdd(invItem: any) {
    const exists = cartItems.find(i => i.name === invItem.name);
    if (exists) {
        updateItem(exists.id, 'qty', exists.qty + 1);
    } else {
        setCartItems([...cartItems, { id: Date.now(), name: invItem.name, qty: 1, price: Number(invItem.unitPrice || 0) }]);
    }
  }

  async function handleRecordSale() {
    if (!buyerName || cartItems.length === 0) return;

    const saleData = {
        id: crypto.randomUUID(), // GENERATE UUID HERE
        customer: buyerName,
        amount: total,
        date: new Date().toISOString(),
        itemsData: cartItems, 
        contact_info: contact,
        syncStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        await db.transaction('rw', db.sales, db.inventory, async () => {
            await db.sales.add(saleData as any);

            if (deductInventory) {
                for (const item of cartItems) {
                    const invItem = await db.inventory.where('name').equals(item.name).first();
                    if (invItem && invItem.id) {
                        await db.inventory.update(invItem.id, {
                            quantity: invItem.quantity - item.qty,
                            syncStatus: 'updated',
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            }
        });

        toast.success("Sale recorded!");
        setIsModalOpen(false);
        setBuyerName(''); setContact(''); setCartItems([{ id: Date.now(), name: '', qty: 1, price: 0 }]);
    } catch (err) {
        toast.error("Failed to record sale");
    }
  }

  function handleSaveSettings(e: any) {
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
    toast.success("Settings saved!");
  }

  // --- PDF GENERATOR ---
  async function generateReceiptPDF(sale: any) {
    const doc = new jsPDF();
    const currency = "GHS";
    
    // Header
    doc.setFillColor(20, 184, 166); // Teal
    doc.rect(0, 0, 210, 55, 'F');
    
    if (logoBase64) {
      const svgString = atob(logoBase64.split(',')[1]);
      await addSvgToPdf(doc, svgString, 15, 10, 35, 35);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(settings.farm_name || "Farm Receipt", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`${settings.phone || ''} | ${settings.email || ''}`, 105, 36, { align: "center" });
    if (settings.address) doc.text(settings.address, 105, 42, { align: "center" });

    // Customer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Receipt #: ${(sale.id || 'N/A').toString().slice(0, 8).toUpperCase()}`, 14, 70);
    doc.text(`Date: ${new Date(sale.date).toLocaleDateString()}`, 14, 76);
    doc.text(`Buyer: ${sale.customer}`, 14, 82);

    // Items
    const items = sale.itemsData || []; 
    autoTable(doc, {
        startY: 90,
        head: [['Item', 'Qty', 'Price', 'Total']],
        body: items.map((i: any) => [ 
            i.name, 
            i.qty, 
            Number(i.price).toFixed(2), 
            (Number(i.qty) * Number(i.price)).toFixed(2) 
        ]),
        theme: 'grid',
        headStyles: { fillColor: [20, 184, 166] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`TOTAL: ${currency} ${Number(sale.amount).toFixed(2)}`, 190, finalY, { align: "right" });

    if (settings.receipt_footer) { 
        doc.setFontSize(10); 
        doc.setTextColor(100, 100, 100); 
        doc.text(settings.receipt_footer, 105, 280, { align: "center" }); 
    }
    
    doc.save(`Receipt_${sale.customer}.pdf`);
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen relative pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Receipts</h1>
          <p className="text-gray-500">Record sales and generate professional receipts</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {selectedIds.length > 0 && (
                <button onClick={() => setIsDeleteModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md animate-in fade-in transition-colors flex-1 md:flex-none justify-center">
                    <Trash2 className="w-4 h-4" /> Delete ({selectedIds.length})
                </button>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 shadow-sm flex items-center gap-2 flex-1 md:flex-none justify-center">
                <Settings className="w-4 h-4" /> Settings
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-primary-200 flex-1 md:flex-none justify-center">
                <Plus className="w-5 h-5" /> New Sale
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-gray-800 text-lg">Recent Sales</h3>
            <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input 
                    type="text" 
                    placeholder="Search sales..." 
                    className="border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 w-full" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                <th className="p-4 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                        {filteredSales.length > 0 && selectedIds.length === filteredSales.length ? <CheckSquare className="w-5 h-5 text-primary-600"/> : <Square className="w-5 h-5"/>}
                    </button>
                </th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Buyer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSales.map((sale: any) => (
                <tr key={sale.id} className={`hover:bg-gray-50 ${selectedIds.includes(sale.id!) ? 'bg-blue-50' : ''}`}>
                  <td className="p-4">
                      <button onClick={() => toggleSelect(sale.id!)} className="text-gray-400 hover:text-gray-600">
                        {selectedIds.includes(sale.id!) ? <CheckSquare className="w-5 h-5 text-blue-600"/> : <Square className="w-5 h-5"/>}
                      </button>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{sale.customer}</div>
                    <div className="text-xs text-gray-500">{sale.contact_info}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    {(sale.itemsData || []).map((i: any) => `${i.name} (${i.qty})`).join(', ') || 'No items'}
                  </td>
                  <td className="p-4 font-bold text-gray-800">GH₵ {Number(sale.amount).toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setViewingReceipt(sale)} className="text-blue-600 hover:underline text-sm font-medium">View</button>
                    <span className="mx-2 text-gray-300">|</span>
                    <button onClick={() => generateReceiptPDF(sale)} className="text-green-600 hover:underline text-sm font-medium">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* VIEW RECEIPT MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setViewingReceipt(null)}>
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-center font-bold text-lg mb-4">Sale Details</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Date:</span> <span>{new Date(viewingReceipt.date).toLocaleString()}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Buyer:</span> <span>{viewingReceipt.customer}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Contact:</span> <span>{viewingReceipt.contact_info || 'N/A'}</span></div>
                </div>
                <div className="mt-6">
                    <h4 className="font-bold mb-2">Items</h4>
                    <div className="space-y-2 border p-3 rounded-lg bg-gray-50">
                        {viewingReceipt.itemsData?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span>{item.name} (x{item.qty})</span>
                                <span className="font-medium">GH₵ {(Number(item.qty) * Number(item.price)).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between font-bold text-lg text-gray-900"><span>Total:</span> <span>GH₵ {Number(viewingReceipt.amount).toFixed(2)}</span></div>
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => setViewingReceipt(null)} className="flex-1 bg-gray-100 py-3 rounded-lg font-medium">Close</button>
                    <button onClick={() => generateReceiptPDF(viewingReceipt)} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl text-center animate-in zoom-in-95">
                <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500"/>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Sales?</h3>
                <p className="text-gray-500 text-sm mb-6">
                    You are about to delete <strong>{selectedIds.length}</strong> records. 
                    This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-bold text-gray-600 hover:bg-gray-200">Cancel</button>
                    <button onClick={executeBulkDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Receipt Settings</h2>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="text-gray-400" /></button>
                </div>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                    <input name="farm_name" required defaultValue={settings.farm_name} className="w-full border p-2 rounded outline-none focus:border-primary-500" placeholder="Farm Name"/>
                    <input name="phone" defaultValue={settings.phone} className="w-full border p-2 rounded outline-none focus:border-primary-500" placeholder="Phone"/>
                    <input name="email" defaultValue={settings.email} className="w-full border p-2 rounded outline-none focus:border-primary-500" placeholder="Email"/>
                    <input name="address" defaultValue={settings.address} className="w-full border p-2 rounded outline-none focus:border-primary-500" placeholder="Address"/>
                    <input name="footer" defaultValue={settings.receipt_footer} className="w-full border p-2 rounded outline-none focus:border-primary-500" placeholder="Footer Message"/>
                    <input name="tax" type="number" defaultValue={settings.tax_rate} className="w-full border p-2 rounded outline-none focus:border-primary-500" placeholder="Tax Rate (%)"/>
                    <button className="w-full bg-gray-900 text-white py-2 rounded font-bold">Save Settings</button>
                </form>
            </div>
        </div>
      )}

      {/* NEW SALE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record New Sale</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Buyer Name" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                    <input type="text" placeholder="Contact Info" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" value={contact} onChange={(e) => setContact(e.target.value)} />
                </div>
                
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={deductInventory} onChange={(e) => setDeductInventory(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                        <label className="text-sm text-gray-700 font-medium">Deduct stock from inventory</label>
                    </div>
                    {deductInventory && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Quick Add from Stock</p>
                            <div className="flex flex-wrap gap-2">
                                {inventory.slice(0, 6).map((inv: any) => (
                                    <button key={inv.id} onClick={() => quickAdd(inv)} className="px-3 py-1 bg-white text-blue-700 border border-blue-200 text-xs rounded-full hover:bg-blue-100 flex items-center gap-1 transition-colors">
                                        <Plus className="w-3 h-3" /> {inv.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-700">Items</label>
                        <button onClick={addItem} className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline">
                            <Plus className="w-4 h-4" /> Add Line Item
                        </button>
                    </div>
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center">
                            <input 
                                list="inventory-list" 
                                type="text" 
                                placeholder="Item Name" 
                                className="flex-[2] border p-2 rounded-lg text-sm outline-none focus:border-primary-500" 
                                value={item.name} 
                                onChange={(e) => { 
                                    updateItem(item.id, 'name', e.target.value); 
                                    const match = inventory.find((inv: any) => inv.name === e.target.value); 
                                    if (match) updateItem(item.id, 'price', Number(match.unitPrice)); 
                                }} 
                            />
                            <datalist id="inventory-list">{inventory.map((inv: any) => <option key={inv.id} value={inv.name} />)}</datalist>
                            
                            <input type="number" placeholder="Qty" className="w-16 border p-2 rounded-lg text-sm outline-none focus:border-primary-500" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                            <input type="number" placeholder="Price" className="w-24 border p-2 rounded-lg text-sm outline-none focus:border-primary-500" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} />
                            
                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between font-bold text-lg text-gray-900">
                        <span>Total:</span>
                        <span>GH₵ {total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 rounded-b-xl">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleRecordSale} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold">Record Sale</button>
            </div>
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
