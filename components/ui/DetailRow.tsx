import React from 'react';

export function DetailRow({ label, value, capitalize }: { label: string; value: React.ReactNode; capitalize?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <div className={`font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</div>
    </div>
  );
}
