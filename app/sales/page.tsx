'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Calendar, TrendingUp, Plus, X, FileText, Trash2, CheckCircle, Settings, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/lib/logo'; // Import the logo

export default function SalesReceipts() {
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const [settings, setSettings] = useState<any>({ farm_name: 'Hughes Farms', phone: '', email: '', address: '', receipt_footer: 'Thank you!', tax_rate: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [cartItems, setCartItems] = useState([{ id: 1, name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');
  const [contact, setContact] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  const [toast, setToast] = useState({ show: false, message: '' });

  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  const taxAmount = subtotal * (Number(settings.tax_rate) / 100);
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetchSales();
    fetchInventory();
    fetchSettings();
  }, []);

  async function fetchSales() { try { const res = await fetch('/api/sales'); if(res.ok) setSales(await res.json()); } catch (e) {} }
  async function fetchInventory() { try { const res = await fetch('/api/inventory'); if(res.ok) setInventory(await res.json()); } catch (e) {} }
  async function fetchSettings() { try { const res = await fetch('/api/settings'); if(res.ok) setSettings(await res.json()); } catch (e) {} }

  function showNotification(message: string) { setToast({ show: true, message }); setTimeout(() => setToast({ show: false, message: '' }), 3000); }
  function addItem() { setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]); }
  function removeItem(id: number) { setCartItems(cartItems.filter(item => item.id !== id)); }
  function updateItem(id: number, field: string, value: any) { setCartItems(cartItems.map(item => item.id === id ? { ...item, [field]: value } : item)); }
  function quickAdd(invItem: any) {
    const exists = cartItems.find(i => i.name === invItem.item_name);
    if (exists) {
        updateItem(exists.id, 'qty', exists.qty + 1);
    } else {
        setCartItems([...cartItems, { id: Date.now(), name: invItem.item_name, qty: 1, price: Number(invItem.unit_price) }]);
    }
  }

  async function handleRecordSale() {
    if (!buyerName || cartItems.length === 0) return;
    const payload = { buyer_name: buyerName, contact_info: contact, total_amount: total, items: cartItems, deduct_inventory: deductInventory };
    const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
        fetchSales();
        fetchInventory();
        setIsModalOpen(false);
        showNotification('Sale recorded!');
        setBuyerName(''); setContact(''); setCartItems([{ id: Date.now(), name: '', qty: 1, price: 0 }]);
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
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (res.ok) {
        setSettings(formData);
        setIsSettingsOpen(false);
        showNotification('Settings saved!');
    }
  }

  function generateReceipt(sale: any) {
    const doc = new jsPDF();
    const currency = "GHS";

    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 50, 'F');
    
    // --- USE THE SVG LOGO ---
    if (logoBase64) {
      doc.addImage(logoBase64, 'SVG', 15, 10, 30, 30);
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
    doc.text(`Receipt #: ${sale.id.slice(0, 8).toUpperCase()}`, 14, 65);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString()}`, 14, 71);
    doc.text(`Buyer: ${sale.buyer_name}`, 14, 77);

    autoTable(doc, {
        startY: 85,
        head: [['Item', 'Qty', 'Price', 'Total']],
        body: (sale.items_data || []).map((i: any) => [ i.name, i.qty, Number(i.price).toFixed(2), (i.qty * i.price).toFixed(2) ]),
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
      {/* ... (rest of the component is the same, no need to change JSX) ... */}
    </div>
  );
}
// Keep all other functions and JSX from previous step
