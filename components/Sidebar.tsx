"use client";

import { useState, useEffect } from "react"; // ✅ Added useEffect
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from 'next-auth/react'; 
import SyncStatus from "@/components/SyncStatus";
import { logoBase64 } from "@/lib/logo"; // Default logo
import { 
  Menu, X, Home, Tractor, Settings, Beef, Package, 
  Users, ClipboardList, DollarSign, BarChart3, TrendingDown,
  Shield, LogOut 
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession(); 
  
  // ✅ State for Dynamic Branding
  const [brand, setBrand] = useState({ name: 'Hughes Farms', logo: '' });

  // ✅ Fetch dynamic branding on mount
  useEffect(() => {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            if (data.farm_name) {
                // Use fetched data, fallback to defaults if empty
                setBrand({ 
                    name: data.farm_name, 
                    logo: data.logo || '' 
                });
            }
        })
        .catch(err => console.error("Failed to load brand"));
  }, []);

  const links = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Livestock", href: "/livestock", icon: Beef },
    { name: "Crops", href: "/crops", icon: Tractor },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Tasks", href: "/tasks", icon: ClipboardList },
    { name: "Expenses", href: "/expenses", icon: TrendingDown },
    { name: "Sales", href: "/sales", icon: DollarSign },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-emerald-900 z-50 p-4 border-b border-white/10 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-3">
            {/* ✅ Dynamic Mobile Logo */}
            {brand.logo ? (
                <img src={brand.logo} alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
            ) : (
                <img src={logoBase64} alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
            )}
            <span className="font-bold text-lg tracking-wide">{brand.name}</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-white/10 rounded-md">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-emerald-900 to-teal-900 text-white transition-transform duration-300 z-40 w-64 flex flex-col shadow-2xl
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 pt-20 md:pt-0`}
      >
        {/* Brand Section */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 bg-emerald-950/20">
           <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-sm border border-white/5">
             {/* ✅ Dynamic Sidebar Logo */}
             {brand.logo ? (
                 <img 
                   src={brand.logo} 
                   className="w-10 h-10 object-contain drop-shadow-md" 
                   alt="Farm Logo"
                 />
             ) : (
                 <img 
                   src={logoBase64} 
                   className="w-10 h-10 object-contain drop-shadow-md" 
                   alt="Hughes Farms Logo"
                 />
             )}
           </div>
           <div>
             {/* ✅ Dynamic Farm Name */}
             <h1 className="font-bold text-lg leading-tight tracking-wide text-white">
                {brand.name === 'Hughes Farms' ? (
                    <>Hughes<br/>Farms</>
                ) : (
                    brand.name
                )}
             </h1>
           </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 
          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsOpen(false)} 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? "bg-white text-emerald-900 shadow-lg font-bold translate-x-1" 
                    : "text-emerald-100/80 hover:bg-white/10 hover:text-white hover:translate-x-1"
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? "text-emerald-700" : "text-emerald-200/70"}`} />
                {link.name}
              </Link>
            );
          })}

          {/* ADMIN SECTION */}
          {(session?.user as any)?.role === 'Admin' && (
            <div className="pt-2 mt-2 border-t border-white/10">
                <Link 
                    href="/admin/users" 
                    onClick={() => setIsOpen(false)} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                    pathname === '/admin/users'
                        ? "bg-purple-100 text-purple-900 shadow-lg font-bold translate-x-1" 
                        : "text-purple-200/80 hover:bg-white/10 hover:text-white hover:translate-x-1"
                    }`}
                >
                    <Shield className={`w-5 h-5 ${pathname === '/admin/users' ? "text-purple-700" : "text-purple-300/70"}`} />
                    User Accounts
                </Link>
            </div>
          )}
        </nav>

        {/* Footer Area with Sign Out and Sync Status */}
        <div className="p-4 bg-black/20 border-t border-white/5 space-y-3">
            <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-200 hover:bg-red-900/20 hover:text-white transition-colors"
            >
                <LogOut className="w-5 h-5" />
                Sign Out
            </button>

            <SyncStatus />
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
