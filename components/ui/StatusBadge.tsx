import React from 'react';
import { Badge } from '@/components/ui/Badge';

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() || '';
  let variant: "primary" | "secondary" | "success" | "warning" | "danger" | "info" = "secondary";

  if (s.includes('ready') || s.includes('growing') || s.includes('pending')) {
    variant = "warning";
  } else if (s === 'harvested' || s === 'planted') {
    variant = "primary";
  } else if (s === 'healthy' || s === 'completed') {
    variant = "success";
  } else if (s === 'sick' || s === 'deceased') {
    variant = "danger";
  }

  return (
    <Badge variant={variant} className="uppercase tracking-wide font-bold">
      {status}
    </Badge>
  );
}

