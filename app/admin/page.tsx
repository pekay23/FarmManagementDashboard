"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  DollarSign,
  Loader2,
  Sprout,
  type LucideIcon,
} from "lucide-react";

type DashboardData = {
  allFarms?: { id: string; name: string }[];
  kpi?: {
    crops?: number;
    animals?: number;
    sales?: number;
    tasks?: number;
  };
  alerts?: {
    lowStock?: { name: string; quantity: number; unit?: string }[];
    overdue?: { title: string; due_date?: string; dueDate?: string }[];
    harvests?: { crop_type: string; plot_number?: string; expected_harvest_date?: string }[];
  };
  activity?: { type: string; title: string; date: string; detail?: string }[];
};

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-foreground">{value}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard?farm_id=all", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load platform dashboard.");
        const payload = await response.json();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load platform dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalFarms = data?.allFarms?.length ?? 0;
  const alertsCount = useMemo(() => {
    return (
      (data?.alerts?.lowStock?.length ?? 0) +
      (data?.alerts?.overdue?.length ?? 0) +
      (data?.alerts?.harvests?.length ?? 0)
    );
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:px-8 lg:py-10">
        <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-foreground">Platform dashboard unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 pb-12 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Super admin portal</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Platform Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor aggregate farm activity without entering the farm operator workspace.</p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Manage farms
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Farms" value={String(totalFarms)} detail="Active owner accounts" icon={Building2} />
        <StatCard title="Crops" value={String(data?.kpi?.crops ?? 0)} detail="Tracked across farms" icon={Sprout} />
        <StatCard title="Sales" value={`GHS ${(data?.kpi?.sales ?? 0).toLocaleString()}`} detail="Aggregate recorded revenue" icon={DollarSign} />
        <StatCard title="Open tasks" value={String(data?.kpi?.tasks ?? 0)} detail={`${alertsCount} current alerts`} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Farm Directory</h2>
              <p className="mt-1 text-xs text-muted-foreground">Recently available farms in the platform scope.</p>
            </div>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {(data?.allFarms ?? []).slice(0, 8).map((farm) => (
              <div key={farm.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{farm.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Farm ID {farm.id}</p>
                </div>
                <Link href={`/admin/users`} className="text-xs font-bold text-primary hover:underline">
                  View owner
                </Link>
              </div>
            ))}
            {totalFarms === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No farms have been created yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Platform Signals</h2>
              <p className="mt-1 text-xs text-muted-foreground">Operational items that may need review.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-warning/20 bg-warning-soft/60 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-warning-fg">Alerts</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{alertsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Low stock, overdue tasks, and upcoming harvests.</p>
            </div>
            {(data?.activity ?? []).slice(0, 4).map((item, index) => (
              <div key={`${item.type}-${item.date}-${index}`} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-bold text-foreground">{item.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{item.detail || new Date(item.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
