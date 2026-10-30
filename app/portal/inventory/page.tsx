'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  Package, AlertTriangle, TrendingDown, Plus, 
  Loader2, Pencil, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useSortableData } from '@/hooks/useSortableData';
import { SortableHeader } from '@/components/ui/SortableHeader';

// ✅ SAFE UUID GENERATOR
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

export default function Inventory() {
  const items = useLiveQuery(() => 
    db.inventory
      .filter(i => i.syncStatus !== 'deleted')
      .reverse()
      .toArray()
  ) || [];
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // ✅ New State for Delete Modal
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  async function handleSubmit(e: any) {
    e.preventDefault();
    const formData = {
        name: e.target.itemName.value,
        category: e.target.category.value,
        quantity: parseFloat(e.target.quantity.value),
        unit: e.target.unit.value,
        lowStockThreshold: parseFloat(e.target.threshold.value),
        unitPrice: parseFloat(e.target.price.value),
        supplier: e.target.supplier.value,
        updatedAt: new Date().toISOString()
    };

    try {
        if (editingItem) {
            await db.inventory.update(editingItem.id, { ...formData, syncStatus: 'updated' });
            toast.success("Item updated");
        } else {
            await db.inventory.add({ 
                id: generateUUID(), 
                ...formData, 
                createdAt: new Date().toISOString(),
                syncStatus: 'pending' 
            } as any);
            toast.success("Item added");
        }
        setIsModalOpen(false);
    } catch {
        toast.error("Failed to save item");
    }
  }

  // ✅ Updated Delete Logic
  async function handleDelete() {
    if (!confirmDelete) return;
    try {
        const item = await db.inventory.get(confirmDelete.id);
        if (item && item.syncStatus === 'pending') {
            await db.inventory.delete(confirmDelete.id);
        } else {
            await db.inventory.update(confirmDelete.id, { syncStatus: 'deleted', updatedAt: new Date().toISOString() });
        }
        toast.success("Item deleted");
    } catch {
        toast.error("Delete failed");
    } finally {
        setConfirmDelete(null);
    }
  }

  const categories = ['All', 'Seeds', 'Fertilizers', 'Pesticides', 'Feeds', 'Medicines', 'Low Stock'];
  
  const filteredItems = items.filter(item => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Low Stock') return item.quantity <= item.lowStockThreshold;
    return item.category === activeCategory;
  });

  const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems);

  const lowStockCount = items.filter(i => i.quantity <= i.lowStockThreshold).length;
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto relative pb-20">
      
      <PageHeader 
        title="Inventory Management" 
        description="Track your farm supplies and materials"
        actions={
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InventoryKpi title="Total Items" value={items.length.toString()} icon={Package} color="blue" />
        <InventoryKpi title="Low Stock Items" value={lowStockCount.toString()} icon={AlertTriangle} color="red" />
        <InventoryKpi title="Total Value" value={`GH₵ ${totalValue.toLocaleString()}`} icon={TrendingDown} color="green" />
      </div>

      <div className="bg-card p-4 rounded-xl shadow-sm border border-border mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {!items ? (
          <div className="p-10 flex justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : items.length === 0 ? (
          <EmptyState 
            icon={<Package className="w-12 h-12" />} 
            title="No inventory items" 
            description="You don't have any inventory items yet. Add one to get started." 
            actionLabel="Add Item"
            onAction={() => { setEditingItem(null); setIsModalOpen(true); }}
          />
      ) : (
          <>
            {/* Desktop View */}
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                  <tr className="bg-muted border-b border-border text-xs uppercase text-muted-foreground tracking-wider">
                      <SortableHeader label="Item Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                      <SortableHeader label="Category" sortKey="category" sortConfig={sortConfig} requestSort={requestSort} />
                      <SortableHeader label="Quantity" sortKey="quantity" sortConfig={sortConfig} requestSort={requestSort} />
                      <SortableHeader label="Min Threshold" sortKey="lowStockThreshold" sortConfig={sortConfig} requestSort={requestSort} />
                      <SortableHeader label="Unit Price" sortKey="unitPrice" sortConfig={sortConfig} requestSort={requestSort} />
                      <th className="p-4 font-semibold">Total Value</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                  {sortedItems.map((item: any) => {
                      const isLow = item.quantity <= item.lowStockThreshold;
                      const val = item.quantity * (item.unitPrice || 0);
                      
                      return (
                      <tr key={item.id} className="hover:bg-muted transition-colors">
                          <td className="p-4">
                          <div className="font-medium text-card-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.supplier || 'No Supplier'}</div>
                          </td>
                          <td className="p-4"><span className="px-2 py-1 bg-secondary rounded-md text-xs">{item.category}</span></td>
                          <td className="p-4 font-medium">{item.quantity} {item.unit}</td>
                          <td className="p-4 text-muted-foreground text-sm">{item.lowStockThreshold} {item.unit}</td>
                          <td className="p-4 text-muted-foreground dark:text-muted-foreground">GH₵ {(item.unitPrice || 0).toFixed(2)}</td>
                          <td className="p-4 font-bold text-card-foreground">GH₵ {val.toFixed(2)}</td>
                          <td className="p-4">
                              <Badge variant={isLow ? 'danger' : 'success'}>
                                  {isLow ? 'Low Stock' : 'In Stock'}
                              </Badge>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsModalOpen(true); }}>
                                  <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hover:text-red-600" onClick={() => setConfirmDelete(item)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                          </td>
                      </tr>
                      );
                  })}
                  </tbody>
              </table>
              </div>
            </Card>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredItems.map((item: any) => {
                const isLow = item.quantity <= item.lowStockThreshold;
                const val = item.quantity * (item.unitPrice || 0);
                
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-card-foreground">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">{item.supplier || 'No Supplier'}</p>
                        </div>
                        <Badge variant={isLow ? 'danger' : 'success'}>
                            {isLow ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                        <div className="text-muted-foreground">Category:</div>
                        <div className="text-right">{item.category}</div>
                        <div className="text-muted-foreground">Quantity:</div>
                        <div className="text-right font-medium">{item.quantity} {item.unit}</div>
                        <div className="text-muted-foreground">Value:</div>
                        <div className="text-right font-bold text-card-foreground">GH₵ {val.toFixed(2)}</div>
                      </div>
                      <div className="flex justify-end gap-2 border-t pt-3">
                        <Button variant="secondary" size="sm" onClick={() => { setEditingItem(item); setIsModalOpen(true); }}>
                            Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(item)}>
                            Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
      )}

      {/* ✅ DELETE CONFIRMATION MODAL */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Item?">
        <div className="text-center pb-6">
          <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500"/>
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-6">
              Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* ✅ ADD/EDIT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Item' : 'Add New Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="itemName" label="Item Name" required defaultValue={editingItem?.name} />
          
          <Select name="category" label="Category" defaultValue={editingItem?.category || 'Seeds'}>
            <option>Seeds</option>
            <option>Fertilizers</option>
            <option>Pesticides</option>
            <option>Feeds</option>
            <option>Medicines</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input name="quantity" label="Quantity" required type="number" defaultValue={editingItem?.quantity} />
            <Input name="unit" label="Unit" required placeholder="kg" defaultValue={editingItem?.unit} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="threshold" label="Threshold" required type="number" defaultValue={editingItem?.lowStockThreshold || 10} />
            <Input name="price" label="Price (GH₵)" required type="number" step="0.01" defaultValue={editingItem?.unitPrice} />
          </div>

          <Input name="supplier" label="Supplier" defaultValue={editingItem?.supplier} />

          <Button type="submit" className="w-full">
            {editingItem ? 'Update Item' : 'Save Item'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function InventoryKpi({ title, value, icon: Icon, color }: any) {
  const colors: any = { 
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", 
    red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400", 
    green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
  };
  return (
    <Card className="flex items-center gap-4 border-none">
      <CardContent className="p-6 flex items-center gap-4 w-full">
        <div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div>
        <div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-card-foreground">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
