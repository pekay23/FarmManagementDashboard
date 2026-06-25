'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ReceiptModalProps {
  receipt: any;
  onClose: () => void;
  onDownload: (sale: any) => void;
}

export function ReceiptModal({ receipt, onClose, onDownload }: ReceiptModalProps) {
  if (!receipt) return null;

  return (
    <Modal isOpen={!!receipt} onClose={onClose} title="Sale Details">
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground font-medium">Date:</span>
          <span className="text-foreground font-semibold">{receipt.date ? new Date(receipt.date).toLocaleString() : ''}</span>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground font-medium">Buyer:</span>
          <span className="text-foreground font-semibold">{receipt.customer}</span>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground font-medium">Contact:</span>
          <span className="text-foreground font-semibold">{receipt.contact_info || 'N/A'}</span>
        </div>
      </div>
      <div className="mt-6">
        <h4 className="font-bold mb-2 text-foreground">Items</h4>
        <div className="space-y-2 border border-border p-3 rounded-lg bg-muted text-foreground">
          {receipt.itemsData?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} (x{item.qty})</span>
              <span className="font-medium">GH₵ {(Number(item.qty) * Number(item.price)).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex justify-between font-bold text-lg text-foreground">
          <span>Total:</span>
          <span className="text-primary">GH₵ {Number(receipt.amount).toFixed(2)}</span>
        </div>
      </div>
      <div className="flex gap-4 mt-8">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { onDownload(receipt); onClose(); }}>
          <Download className="w-4 h-4 mr-2" /> Download
        </Button>
      </div>
    </Modal>
  );
}
