import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, action, icon, className }: PageHeaderProps) {
  const actionContent = actions || action;
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && <div className="shrink-0">{icon}</div>}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {actionContent && <div className="flex items-center space-x-3">{actionContent}</div>}
    </div>
  );
}
