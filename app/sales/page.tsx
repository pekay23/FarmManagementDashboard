'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Calendar, TrendingUp, Plus, X, FileText, Trash2, CheckCircle, Settings, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SalesReceipts() {
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState<any>({
    farm_name: 'Hughes Farms',
    phone: '',
    email: '',
    address: '',
    receipt_footer: 'Thank you for your business!',
    tax_rate: 0
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form State
  const [cartItems, setCartItems] = useState([{ id: 1, name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');
  const [contact, setContact] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  // Notification State
  const [toast, setToast] = useState({ show: false, message: '' });

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  const taxAmount = subtotal * (Number(settings.tax_rate) / 100);
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetchSales();
    fetchInventory();
    fetchSettings();
  }, []);

  async function fetchSales() {
    try {
        const res = await fetch('/api/sales');
        const data = await res.json();
        if (Array.isArray(data)) setSales(data);
    } catch (e) { console.error(e); }
  }

  async function fetchInventory() {
    try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (Array.isArray(data)) setInventory(data);
    } catch (e) { console.error(e); }
  }

  async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.id) setSettings(data);
    } catch (e) { console.error(e); }
  }

  // --- ACTIONS ---

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => {
        setToast({ show: false, message: '' });
    }, 3000);
  }

  function addItem() {
    setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]);
  }

  function removeItem(id: number) {
    setCartItems(cartItems.filter(item => item.id !== id));
  }

  function updateItem(id: number, field: string, value: any) {
    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setCartItems(updatedCart);
  }

  function quickAdd(invItem: any) {
    const exists = cartItems.find(i => i.name === invItem.item_name);
    if (exists) {
        updateItem(exists.id, 'qty', exists.qty + 1);
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
    if (!buyerName || cartItems.length === 0) return alert("Please fill details");

    const payload = {
        buyer_name: buyerName,
        contact_info: contact,
        total_amount: total,
        items: cartItems,
        deduct_inventory: deductInventory
    };

    const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        fetchSales();
        fetchInventory();
        setIsModalOpen(false);
        showNotification('Sale recorded successfully!');
        setBuyerName('');
        setContact('');
        setCartItems([{ id: Date.now(), name: '', qty: 1, price: 0 }]);
    }
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

    const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    if (res.ok) {
        setSettings(formData);
        setIsSettingsOpen(false);
        showNotification('Receipt settings saved!');
    }
  }

    function generateReceipt(sale: any) {
    const doc = new jsPDF();
    
    // NOTE: Standard PDF fonts usually cannot render the '₵' symbol.
    // We use the official ISO code "GHS" for the PDF to ensure it prints correctly.
    const currency = "GHS"; 

    // Header
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    
    doc.setFontSize(22);
    doc.text(settings.farm_name, 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text("Official Sales Receipt", 105, 28, { align: "center" });
    
    let contactLine = "";
    if (settings.phone) contactLine += `Tel: ${settings.phone}  `;
    if (settings.email) contactLine += `Email: ${settings.email}`;
    doc.text(contactLine, 105, 36, { align: "center" });
    
    if (settings.address) {
        doc.text(settings.address, 105, 42, { align: "center" });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Receipt #: ${sale.id.slice(0, 8).toUpperCase()}`, 14, 65);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString()}`, 14, 71);
    doc.text(`Buyer: ${sale.buyer_name}`, 14, 77);
    doc.text(`Contact: ${sale.contact_info || 'N/A'}`, 14, 83);

    const items = sale.items_data || [];
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
        headStyles: { fillColor: [34, 197, 94] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    
    // Using "GHS" ensures the currency is readable
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
      
      {/* SUCCESS TOAST */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <div className="bg-green-500 rounded-full p-1">
                <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
                <h4 className="font-bold text-sm">Success</h4>
                <p className="text-xs text-gray-300">{toast.message}</p>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Receipts</h1>
          <p className="text-gray-500">Record sales and generate professional receipts</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors shadow-sm flex items-center gap-2"
            >
                <Settings className="w-4 h-4" />
                Receipt Settings
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-green-200 shadow-lg"
            >
                <Plus className="w-5 h-5" />
                New Sale
            </button>
        </div>
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
                  <td className="p-4 text-gray-600 text-sm">{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{sale.buyer_name}</div>
                    <div className="text-xs text-gray-500">{sale.contact_info}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    {sale.items_data?.map((i: any) => `${i.name} (${i.qty})`).join(', ') || 'No items'}
                  </td>
                  <td className="p-4 font-bold text-gray-800">GH₵ {Number(sale.total_amount).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                      {sale.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                        onClick={() => generateReceipt(sale)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-end gap-1 ml-auto"
                    >
                        <FileText className="w-4 h-4" /> View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Receipt Settings */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Receipt Configuration</h2>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Farm / Business Name</label>
                        <input name="farm_name" required defaultValue={settings.farm_name} className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input name="phone" defaultValue={settings.phone} placeholder="+233..." className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                            <input name="tax" type="number" step="0.1" defaultValue={settings.tax_rate} className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" />
                            <p className="text-xs text-gray-400 mt-1">Example: 3.0 for VFRS or 15.0 for VAT</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input name="email" defaultValue={settings.email} className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea name="address" rows={2} defaultValue={settings.address} className="w-full border p-2.5 rounded-lg resize-none outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Footer Message</label>
                        <input name="footer" defaultValue={settings.receipt_footer} className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" />
                    </div>
                    
                    <button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2">
                        <Save className="w-4 h-4" /> Save Settings
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: Record New Sale */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record New Sale</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Buyer Name" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                    <input type="text" placeholder="Contact (Phone/Email)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" value={contact} onChange={(e) => setContact(e.target.value)} />
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={deductInventory} onChange={(e) => setDeductInventory(e.target.checked)} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                        <label className="text-sm text-gray-700 font-medium">Sell from inventory (auto-deduct quantities)</label>
                    </div>
                    {deductInventory && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Quick Add from Inventory:</p>
                            <div className="flex flex-wrap gap-2">
                                {inventory.slice(0, 5).map(inv => (
                                    <button 
                                        key={inv.id} 
                                        onClick={() => quickAdd(inv)}
                                        className="px-3 py-1 bg-white text-blue-700 border border-blue-200 text-xs rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {inv.item_name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-700">Sale Items</label>
                        <button onClick={addItem} className="text-sm text-green-600 font-medium hover:text-green-700 flex items-center gap-1"><Plus className="w-4 h-4" /> Add Item</button>
                    </div>
                    
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center">
                            <input 
                                list="inventory-list" 
                                type="text" 
                                placeholder="Item Name" 
                                className="flex-[2] border p-2 rounded-lg text-sm outline-none focus:border-green-500"
                                value={item.name}
                                onChange={(e) => {
                                    updateItem(item.id, 'name', e.target.value);
                                    const match = inventory.find(inv => inv.item_name === e.target.value);
                                    if (match) updateItem(item.id, 'price', Number(match.unit_price));
                                }}
                            />
                            <datalist id="inventory-list">
                                {inventory.map(inv => <option key={inv.id} value={inv.item_name} />)}
                            </datalist>

                            <input type="number" placeholder="Qty" className="w-16 border p-2 rounded-lg text-sm outline-none focus:border-green-500" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                            <input type="number" placeholder="Price" className="w-24 border p-2 rounded-lg text-sm outline-none focus:border-green-500" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} />
                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>GH₵ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Tax ({settings.tax_rate}%):</span>
                        <span>GH₵ {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span>GH₵ {total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 rounded-b-xl">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleRecordSale} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-green-200">Record Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
