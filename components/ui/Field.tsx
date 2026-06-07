import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  help,
  error,
  children,
  className,
}: {
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs font-medium text-destructive">{error}</span>
      ) : help ? (
        <span className="block text-xs text-muted-foreground">{help}</span>
      ) : null}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-lg border border-input bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60";
