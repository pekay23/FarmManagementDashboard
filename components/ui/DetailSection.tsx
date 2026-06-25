import React from 'react';

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide opacity-80">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
