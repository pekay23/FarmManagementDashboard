import { X } from 'lucide-react';
import React from 'react';

export function Modal({ title, onClose, children, isOpen }: { title: string; onClose: () => void; children: React.ReactNode; isOpen?: boolean }) {
    // If isOpen is explicitly false, don't render. If undefined (legacy usage), always render.
    if (isOpen === false) return null;

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-card text-card-foreground rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4 sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold">{title}</h2>
              <button onClick={onClose}><X className="text-muted-foreground hover:text-foreground" /></button>
            </div>
            {children}
          </div>
        </div>
    );
}
