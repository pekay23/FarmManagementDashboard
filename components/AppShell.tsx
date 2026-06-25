"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  Beef,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  GitMerge,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Paperclip,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Sprout,
  Tractor,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SyncStatus from "@/components/SyncStatus";

const farmSections = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", href: "/", icon: Home },
      { name: "Livestock", href: "/livestock", icon: Beef },
      { name: "Crops", href: "/crops", icon: Tractor },
      { name: "Scouting", href: "/scouting", icon: Map },
      { name: "Inventory", href: "/inventory", icon: Package },
    ],
  },
  {
    label: "Workforce",
    items: [
      { name: "Employees", href: "/employees", icon: Users },
      { name: "Tasks", href: "/tasks", icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Expenses", href: "/expenses", icon: TrendingDown },
      { name: "Sales", href: "/sales", icon: DollarSign },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Attachments", href: "/attachments", icon: Paperclip },
      { name: "Sync Conflicts", href: "/sync-conflicts", icon: GitMerge },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const adminSections = [
  {
    label: "Platform",
    items: [
      { name: "Platform Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Farm Owners", href: "/admin/users", icon: Shield },
      { name: "Permissions", href: "/admin/permissions", icon: ShieldCheck },
      { name: "Audit Logs", href: "/admin/audit", icon: ScrollText },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/livestock": "Livestock",
  "/crops": "Crops",
  "/scouting": "Scouting",
  "/inventory": "Inventory",
  "/employees": "Employees",
  "/tasks": "Tasks",
  "/expenses": "Expenses",
  "/sales": "Sales",
  "/reports": "Reports",
  "/settings": "Settings",
  "/attachments": "Attachments",
  "/sync-conflicts": "Sync Conflicts",
  "/profile": "Profile",
  "/admin": "Platform Dashboard",
  "/admin/users": "Farm Owners",
  "/admin/permissions": "Permissions",
  "/admin/audit": "Audit Logs",
};

type PortalMode = "admin" | "farm";

function useBrand(portalMode: PortalMode) {
  const { data: session } = useSession();
  const [brand, setBrand] = useState({ name: "FieldOps", logo: "" });

  useEffect(() => {
    if (!session) return;

    if (portalMode === "admin") {
      queueMicrotask(() => setBrand({ name: "FieldOps Admin", logo: "" }));
      return;
    }

    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.farm_name) {
          setBrand({ name: data.farm_name, logo: data.logo || "" });
        }
      })
      .catch(() => {
        setBrand({ name: "FieldOps", logo: "" });
      });
  }, [session, portalMode]);

  return brand;
}

function Breadcrumbs({ pathname, portalMode }: { pathname: string; portalMode: PortalMode }) {
  const segments = pathname.split("/").filter(Boolean);
  const current = pageTitles[pathname] || segments.at(-1)?.replaceAll("-", " ") || "Dashboard";
  const rootHref = portalMode === "admin" ? "/admin" : "/";
  const rootLabel = portalMode === "admin" ? "Admin" : "Workspace";
  const visibleSegments = portalMode === "admin" && segments[0] === "admin" ? segments.slice(1) : segments;

  return (
    <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs" aria-label="Breadcrumb">
      <Link href={rootHref} className="font-semibold text-muted-foreground transition-colors hover:text-foreground">
        {rootLabel}
      </Link>
      {visibleSegments.length > 0 && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <span className="truncate font-bold capitalize text-foreground">{current}</span>
        </>
      )}
    </nav>
  );
}

function SidebarContent({
  brand,
  collapsed,
  portalMode,
  pathname,
  onNavigate,
  onToggleCollapsed,
  userEmail,
}: {
  brand: { name: string; logo: string };
  collapsed: boolean;
  portalMode: PortalMode;
  pathname: string;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
  userEmail?: string | null;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const isAdminPortal = portalMode === "admin";
  const sections = isAdminPortal ? adminSections : farmSections;
  const initials = brand.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HF";

  return (
    <div className="relative flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/60 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-primary shadow-sm">
          {brand.logo ? (
            <Image src={brand.logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
          ) : (
            <Sprout className="h-5 w-5" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold tracking-tight text-sidebar-foreground">{brand.name}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">
              {isAdminPortal ? "Platform control" : "Farm operations"}
            </p>
          </div>
        )}
      </div>
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute top-5 -right-3 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex === 0 ? "" : "mt-8"}>
            {!collapsed && (
              <p className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    title={collapsed ? link.name : undefined}
                    className={`group relative flex items-center rounded-lg text-sm font-semibold transition-all duration-200 ${
                      collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/72 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
                    <link.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "opacity-70 group-hover:opacity-100"}`} />
                    {!collapsed && <span className="truncate">{link.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative mt-auto border-t border-sidebar-border/60 p-3">
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          className={`flex w-full items-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 text-left transition-colors hover:bg-sidebar-accent ${
            collapsed ? "justify-center p-2.5" : "gap-3 p-3"
          }`}
          aria-expanded={accountOpen}
          title={collapsed ? "Account menu" : undefined}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-black text-primary-foreground">
            {initials}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-sidebar-foreground">
                  {userEmail || (isAdminPortal ? "Platform account" : "Farm account")}
                </span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {isAdminPortal ? "Administrator" : "Operator"}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-sidebar-foreground/50 transition-transform ${accountOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {accountOpen && (
          <div
            className={`${
              collapsed
                ? "absolute bottom-3 left-[calc(100%+0.75rem)] w-64 rounded-xl border border-border bg-card p-3 text-foreground shadow-xl"
                : "mt-3 space-y-3"
            }`}
          >
            {collapsed && (
              <div className="mb-3 border-b border-border pb-3">
                <p className="truncate text-xs font-bold">{userEmail || "Account"}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAdminPortal ? "Administrator" : "Operator"}
                </p>
              </div>
            )}
            {!isAdminPortal && <SyncStatus />}
            <button
              type="button"
              onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const portalMode: PortalMode = pathname.startsWith("/admin") ? "admin" : "farm";
  const brand = useBrand(portalMode);
  const userEmail = session?.user?.email;

  useEffect(() => {
    const saved = window.localStorage.getItem("farm-shell-collapsed");
    queueMicrotask(() => { if (saved) setCollapsed(saved === "true"); });
  }, []);

  const today = useMemo(
    () => new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
    []
  );

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const pageTitle = pageTitles[pathname] || "Farm workspace";

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      window.localStorage.setItem("farm-shell-collapsed", String(!value));
      return !value;
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 hidden border-r border-sidebar-border/60 shadow-sm transition-all duration-300 ease-in-out lg:flex lg:flex-col ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent
          brand={brand}
          collapsed={collapsed}
          portalMode={portalMode}
          pathname={pathname}
          userEmail={userEmail}
          onToggleCollapsed={toggleCollapsed}
        />
      </aside>

      <div
        className={`flex min-h-screen flex-1 flex-col overflow-x-hidden transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <Breadcrumbs pathname={pathname} portalMode={portalMode} />
              <h1 className="mt-0.5 truncate text-sm font-extrabold tracking-tight text-foreground lg:hidden">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden min-[1100px]:flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/35 px-3 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-muted-foreground">{today}</span>
            </div>
            <Link
              href={portalMode === "admin" ? "/admin/users" : "/settings"}
              className="hidden h-10 items-center gap-2 rounded-xl border border-border/60 bg-card px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              <Building2 className="h-4 w-4 text-primary" />
              {portalMode === "admin" ? "Farm owners" : "Farm settings"}
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 w-full overflow-x-hidden">{children}</main>

        <footer className="border-t border-border/60 p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
            {portalMode === "admin" ? "FieldOps platform workspace" : "FieldOps operations workspace"}
          </p>
        </footer>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              brand={brand}
              collapsed={false}
              portalMode={portalMode}
              pathname={pathname}
              userEmail={userEmail}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
