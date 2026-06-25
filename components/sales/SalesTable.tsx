'use client';

import { Download, Square, CheckSquare, Search, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSortableData } from '@/hooks/useSortableData';
import { SortableHeader } from '@/components/ui/SortableHeader';

interface SalesTableProps {
  filteredSales: any[];
  selectedIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onView: (sale: any) => void;
  onDownload: (sale: any) => void;
  onNewSale: () => void;
}

export function SalesTable({
  filteredSales,
  selectedIds,
  searchQuery,
  onSearchChange,
  onToggleSelectAll,
  onToggleSelect,
  onView,
  onDownload,
  onNewSale,
}: SalesTableProps) {
  const { items: sortedSales, requestSort, sortConfig } = useSortableData(filteredSales);

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="font-bold text-foreground text-lg">Recent Sales</h3>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search sales..."
            className="border border-border bg-background rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary w-full text-foreground"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {filteredSales.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12" />}
          title="No sales found"
          description={searchQuery ? "No sales match your search query." : "You haven't recorded any sales yet."}
          actionLabel={searchQuery ? undefined : "Record New Sale"}
          onAction={searchQuery ? undefined : onNewSale}
        />
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted text-xs uppercase text-muted-foreground tracking-wider">
                  <th className="p-4 w-10">
                    <button onClick={onToggleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {filteredSales.length > 0 && selectedIds.length === filteredSales.length ? <CheckSquare className="w-5 h-5 text-primary"/> : <Square className="w-5 h-5"/>}
                    </button>
                  </th>
                  <SortableHeader label="Date" sortKey="date" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Buyer" sortKey="customer" sortConfig={sortConfig} requestSort={requestSort} />
                  <th className="p-4 font-semibold">Items</th>
                  <SortableHeader label="Total" sortKey="amount" sortConfig={sortConfig} requestSort={requestSort} />
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedSales.map((sale: any) => (
                  <tr key={sale.id} className={`hover:bg-muted transition-colors ${selectedIds.includes(sale.id!) ? 'bg-primary/10' : ''}`}>
                    <td className="p-4">
                      <button onClick={() => onToggleSelect(sale.id!)} className="text-muted-foreground hover:text-foreground">
                        {selectedIds.includes(sale.id!) ? <CheckSquare className="w-5 h-5 text-primary"/> : <Square className="w-5 h-5"/>}
                      </button>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{new Date(sale.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">{sale.customer}</div>
                      <div className="text-xs text-muted-foreground">{sale.contact_info}</div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                      {(sale.itemsData || []).map((i: any) => `${i.name} (${i.qty})`).join(', ') || 'No items'}
                    </td>
                    <td className="p-4 font-bold text-foreground">GH₵ {Number(sale.amount).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => onView(sale)} className="text-blue-600 hover:underline text-sm font-medium mr-2">View</button>
                      <span className="text-gray-300 dark:text-gray-600 mr-2">|</span>
                      <button onClick={() => onDownload(sale)} className="text-green-600 hover:underline text-sm font-medium">Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
            {sortedSales.map((sale: any) => (
              <Card key={sale.id} className={`${selectedIds.includes(sale.id!) ? 'ring-2 ring-primary border-transparent' : ''}`}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onToggleSelect(sale.id!)} className="text-muted-foreground">
                        {selectedIds.includes(sale.id!) ? <CheckSquare className="w-5 h-5 text-primary"/> : <Square className="w-5 h-5"/>}
                      </button>
                      <div>
                        <h3 className="font-medium text-foreground">{sale.customer}</h3>
                        <p className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="font-bold text-foreground text-right">
                      GH₵ {Number(sale.amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded truncate">
                    {(sale.itemsData || []).map((i: any) => `${i.name} (${i.qty})`).join(', ') || 'No items'}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => onView(sale)}>
                      View Receipt
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-green-600 hover:text-green-700" onClick={() => onDownload(sale)}>
                      <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
