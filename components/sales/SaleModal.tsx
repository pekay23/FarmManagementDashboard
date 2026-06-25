'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface CartItem {
  id: number | string;
  name: string;
  qty: number;
  price: number;
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  buyerName: string;
  contact: string;
  deductInventory: boolean;
  total: number;
  inventory: any[];
  onSetBuyerName: (name: string) => void;
  onSetContact: (contact: string) => void;
  onSetDeductInventory: (val: boolean) => void;
  onAddItem: () => void;
  onRemoveItem: (id: number | string) => void;
  onUpdateItem: (id: number | string, field: string, value: any) => void;
  onQuickAdd: (inv: any) => void;
  onRecordSale: () => void;
}

export function SaleModal({
  isOpen,
  onClose,
  cartItems,
  buyerName,
  contact,
  deductInventory,
  total,
  inventory,
  onSetBuyerName,
  onSetContact,
  onSetDeductInventory,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onQuickAdd,
  onRecordSale,
}: SaleModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record New Sale">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Buyer Name" value={buyerName} onChange={(e) => onSetBuyerName(e.target.value)} />
          <Input placeholder="Contact Info" value={contact} onChange={(e) => onSetContact(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={deductInventory} onChange={(e) => onSetDeductInventory(e.target.checked)} className="w-4 h-4 text-primary rounded" />
            <label className="text-sm text-foreground font-medium">Deduct stock from inventory</label>
          </div>
          {deductInventory && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Quick Add from Stock</p>
              <div className="flex flex-wrap gap-2">
                {inventory.slice(0, 6).map((inv: any) => (
                  <button key={inv.id} onClick={() => onQuickAdd(inv)} className="px-3 py-1 bg-background text-primary border border-primary/20 text-xs rounded-full hover:bg-primary/10 flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> {inv.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-foreground">Items</label>
            <button onClick={onAddItem} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>
          {cartItems.map((item) => (
            <div key={item.id} className="flex gap-2 items-center flex-wrap md:flex-nowrap">
              <Input
                list="inventory-list"
                placeholder="Item Name"
                className="flex-2 min-w-[120px]"
                value={item.name}
                onChange={(e) => {
                  onUpdateItem(item.id, 'name', e.target.value);
                  const match = inventory.find((inv: any) => inv.name === e.target.value);
                  if (match) onUpdateItem(item.id, 'price', Number(match.unitPrice));
                }}
              />
              <datalist id="inventory-list">{inventory.map((inv: any) => <option key={inv.id} value={inv.name} />)}</datalist>

              <Input type="number" placeholder="Qty" className="w-20" value={item.qty} onChange={(e) => onUpdateItem(item.id, 'qty', e.target.value)} />
              <Input type="number" placeholder="Price" className="w-24" value={item.price} onChange={(e) => onUpdateItem(item.id, 'price', e.target.value)} />

              <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between font-bold text-lg text-foreground">
            <span>Total:</span>
            <span>GH₵ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4 pt-4 border-t dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button variant="primary" className="flex-1" onClick={onRecordSale}>Record Sale</Button>
      </div>
    </Modal>
  );
}
