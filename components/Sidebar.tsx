"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from 'next-auth/react';
import SyncStatus from "@/components/SyncStatus";
import ThemeToggle from "@/components/ThemeToggle";

import {
  Menu, X, Home, Tractor, Settings, Beef, Package,
  Users, ClipboardList, DollarSign, BarChart3, TrendingDown,
  Shield, LogOut, LayoutDashboard, Wrench, QrCode, Calendar
} from "lucide-react";
import { FarmSwitcher } from "@/components/FarmSwitcher";

// ✅ LINKS FOR REGULAR FARM USERS
const farmLinks = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Livestock", href: "/livestock", icon: Beef },
  { name: "Crops", href: "/crops", icon: Tractor },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Tasks", href: "/tasks", icon: ClipboardList },
  { name: "Work Orders", href: "/work-orders", icon: Wrench },
  { name: "Traceability", href: "/traceability", icon: QrCode },
  { name: "Planning", href: "/planning", icon: Calendar },
  { name: "Expenses", href: "/expenses", icon: TrendingDown },
  { name: "Sales", href: "/sales", icon: DollarSign },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

// ✅ LINKS FOR THE SUPER ADMIN
const superAdminLinks = [
    { name: "Platform Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Farm Owners", href: "/admin/users", icon: Shield },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Determine user type and which links to show
  const isSuperAdmin = (session?.user as { is_superadmin?: boolean } | undefined)?.is_superadmin;
  const links = isSuperAdmin ? superAdminLinks : farmLinks;

  const [brand, setBrand] = useState({ name: 'FieldOps', logo: '/logo.png' });

  useEffect(() => {
      // Only fetch custom branding for regular farm users
      if (session && !isSuperAdmin) {
        fetch('/api/settings', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
              if (data.farm_name) {
                  setBrand({
                      name: data.farm_name,
                      logo: data.logo || '/logo.png'
                  });
              }
          })
          .catch(() => console.error("Failed to load brand settings"));
      } else if (isSuperAdmin) {
          // Super Admins see the default app branding
          // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from session change
          setBrand({ name: 'Platform Admin', logo: '/logo.png' });
      }
  }, [session, isSuperAdmin]);

  if (pathname === '/login') return null;

  return (
    <>
      <style jsx global>{`
        .modern-scrollbar::-webkit-scrollbar { width: 5px; }
        .modern-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .modern-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 20px; }
        .modern-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.3); }
      `}</style>

      <div className="md:hidden fixed top-0 left-0 w-full bg-emerald-900 z-50 p-4 border-b border-white/10 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-3">
            {brand.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={brand.logo} alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
            ) : (
                <span className="text-2xl">🚜</span>
            )}
            <span className="font-bold text-lg tracking-wide">{brand.name}</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-white/10 rounded-md">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <aside
        className={`fixed top-0 left-0 h-full bg-sidebar-gradient text-sidebar-foreground transition-transform duration-300 z-40 w-64 flex flex-col shadow-2xl
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 pt-20 md:pt-0`}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 bg-black/10">
           <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-sm border border-white/5">
             {brand.logo ? (
                 /* eslint-disable-next-line @next/next/no-img-element */
                 <img src={brand.logo} className="w-10 h-10 object-contain drop-shadow-md" alt="Farm Logo" />
             ) : (
                 <div className="w-10 h-10 flex items-center justify-center text-2xl">🚜</div>
             )}
           </div>
           <div>
             <h1 className="font-bold text-lg leading-tight tracking-wide text-white">
                {brand.name === 'FieldOps' || isSuperAdmin ? (
                    <>FieldOps</>
                ) : (
                    brand.name
                )}
             </h1>
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">

          {links.map((link) => {
            const isActive = pathname === link.href;
            const style = isSuperAdmin
              ? (isActive ? 'bg-purple-100 text-purple-900 shadow-lg' : 'text-purple-200/80 hover:bg-white/10')
              : (isActive ? 'bg-white text-emerald-900 shadow-lg' : 'text-emerald-100/80 hover:bg-white/10');

            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${style}`}
              >
                <link.icon className={`w-5 h-5 shrink-0 ${isActive ? (isSuperAdmin ? 'text-purple-700' : 'text-emerald-700') : (isSuperAdmin ? 'text-purple-300/70' : 'text-emerald-200/70')}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-3">
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
          </div>
          
          <div className="px-1">
            <FarmSwitcher />
          </div>

          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
            className="flex w-full items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>

          <div className="px-4 text-xs text-sidebar-muted pb-4">
             <SyncStatus />
          </div>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
