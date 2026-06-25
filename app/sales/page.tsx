'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Settings, AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  renderHeader, 
  renderFooters, 
  TABLE_HEAD_STYLES, 
  TABLE_STYLES, 
  TABLE_ALT_ROW_STYLES, 
  getFarmLogo,
  fetchBase64Image
} from '@/lib/pdfTemplate';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

import { Modal } from '@/components/ui/Modal';

import { SalesTable } from '@/components/sales/SalesTable';
import { SaleModal } from '@/components/sales/SaleModal';
import { ReceiptModal } from '@/components/sales/ReceiptModal';

// Safe UUID Generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function SalesReceipts() {
  const sales = useLiveQuery(() => db.sales.toArray().then(rows => rows.reverse())) || [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const router = useRouter();
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  
  const [settings, setSettings] = useState<any>({ 
      farm_name: 'FieldOps Farm', 
      phone: '', email: '', address: '', receipt_footer: 'Thank you!', tax_rate: 0, logo: null 
  });

  const [cartItems, setCartItems] = useState([{ id: 1, name: '', qty: 1, price: 0 }]);
  const [buyerName, setBuyerName] = useState('');
  const [contact, setContact] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  const taxAmount = subtotal * (Number(settings.tax_rate) / 100);
  const total = subtotal + taxAmount;

  const filteredSales = sales?.filter(s => 
    s.syncStatus !== 'deleted' && (
        s.customer?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.id?.toString().includes(searchQuery)
    )
  ) || [];

  useEffect(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('farmSettings');
          if (saved) {
              try { queueMicrotask(() => setSettings(JSON.parse(saved))); } catch {}
          }
      }
  }, []);

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
    } catch {
        toast.error("Error deleting sales");
    }
  }

  function addItem() { setCartItems([...cartItems, { id: Date.now(), name: '', qty: 1, price: 0 }]); }
  function removeItem(id: number | string) { setCartItems(cartItems.filter(item => item.id !== id)); }
  function updateItem(id: number | string, field: string, value: any) { 
      setCartItems(cartItems.map(item => item.id === id ? { ...item, [field]: value } : item)); 
  }
  
  function quickAdd(invItem: any) {
    const exists = cartItems.find(i => i.name === invItem.name);
    if (exists) {
        updateItem(exists.id, 'qty', exists.qty + 1);
    } else {
        setCartItems([...cartItems, { id: crypto.randomUUID() as any, name: invItem.name, qty: 1, price: Number(invItem.unitPrice || 0) }]);
    }
  }

  async function handleRecordSale() {
    if (!buyerName || cartItems.length === 0) return;

    const saleData = {
        id: generateUUID(),
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
        console.error(err);
        toast.error("Failed to record sale");
    }
  }

  async function generateReceiptPDF(sale: any) {
    const doc = new jsPDF();
    
    const userLogo = getFarmLogo();
    const logoToUse = userLogo || await fetchBase64Image('/logo.png');

    // Fetch live farm settings
    let farmName = 'FieldOps Farm';
    let settingsData: any = {};
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            settingsData = await res.json();
            if (settingsData.farm_name) farmName = settingsData.farm_name;
        }
    } catch {}

    const y = renderHeader({
      doc,
      title: "RECEIPT",
      refLabel: "No",
      refValue: sale.id.toString().slice(0, 8).toUpperCase(),
      dateStr: new Date(sale.date).toLocaleDateString(),
      logoData: logoToUse,
      farmName: farmName,
      settingsData: settingsData
    });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 15, y + 10);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text([
        sale.customer || "Valued Customer",
        sale.contact_info || "No Contact"
    ], 15, y + 17);

    const items = sale.itemsData || []; 
    autoTable(doc, {
        startY: y + 30,
        head: [['ITEM', 'QTY', 'PRICE', 'TOTAL']],
        body: items.map((i: any) => [ 
            i.name, 
            `${i.qty} Units`, 
            `GHS ${Number(i.price).toFixed(2)}`, 
            `GHS ${(Number(i.qty) * Number(i.price)).toFixed(2)}` 
        ]),
        theme: 'grid',
        headStyles: TABLE_HEAD_STYLES,
        styles: TABLE_STYLES,
        alternateRowStyles: TABLE_ALT_ROW_STYLES
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 78, 59);
    doc.text(`TOTAL AMOUNT: GHS ${Number(sale.amount).toFixed(2)}`, 195, finalY, { align: "right" });

    renderFooters({
      doc,
      customMessage: settings.receipt_footer
    });
    
    doc.save(`Receipt_${sale.customer}.pdf`);
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen relative pb-20">
      <PageHeader 
        title="Sales & Receipts" 
        description="Record sales and generate professional receipts"
        actions={
          <>
            {selectedIds.length > 0 && (
                <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="flex-1 md:flex-none">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedIds.length})
                </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/settings')} className="flex-1 md:flex-none">
                <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none">
                <Plus className="w-4 h-4 mr-2" /> New Sale
            </Button>
          </>
        }
      />

      <SalesTable 
        filteredSales={filteredSales}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onView={setViewingReceipt}
        onDownload={generateReceiptPDF}
        onNewSale={() => setIsModalOpen(true)}
      />

      <ReceiptModal 
        receipt={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        onDownload={generateReceiptPDF}
      />

      <SaleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartItems={cartItems as any[]}
        buyerName={buyerName}
        contact={contact}
        deductInventory={deductInventory}
        total={total}
        inventory={inventory}
        onSetBuyerName={setBuyerName}
        onSetContact={setContact}
        onSetDeductInventory={setDeductInventory}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
        onQuickAdd={quickAdd}
        onRecordSale={handleRecordSale}
      />

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Sales?">
        <div className="text-center pb-6">
          <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500"/>
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-6">
              You are about to delete <strong>{selectedIds.length}</strong> records. 
              This action cannot be undone.
          </p>
          <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={executeBulkDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
