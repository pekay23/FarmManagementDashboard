import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortConfig } from '@/hooks/useSortableData';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  requestSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ label, sortKey, sortConfig, requestSort, className }: SortableHeaderProps) {
  const isActive = sortConfig?.key === sortKey;

  return (
    <th 
      className={`p-4 font-semibold cursor-pointer select-none group transition-colors hover:bg-muted/50 hover:text-primary ${isActive ? 'text-foreground' : 'text-muted-foreground'} ${className || ''}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <span className="inline-flex">
          {isActive ? (
            sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </span>
      </div>
    </th>
  );
}
