"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

export default function ThemeToggle({ variant = "default" }: { variant?: "default" | "shell" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={variant === "shell" ? "h-9 w-9" : "h-10 w-10"} aria-hidden />;
  }

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const label = theme === "system" ? `System (${resolvedTheme})` : theme === "dark" ? "Dark" : "Light";
  const Icon = theme === "dark" ? Moon : theme === "system" ? Monitor : Sun;
  const className =
    variant === "shell"
      ? "h-9 w-9 inline-flex items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
      : "h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${label} - click to switch`}
      aria-label={`Switch theme (current: ${label})`}
      className={className}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
