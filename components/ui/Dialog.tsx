import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function DialogShell({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn("max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card shadow-2xl", className)}
      >
        <header className="flex items-center justify-between border-b border-border p-5">
          <h2 id="dialog-title" className="text-lg font-extrabold text-foreground">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
