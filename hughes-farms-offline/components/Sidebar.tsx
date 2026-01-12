'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sprout, Cat, Package, ShoppingCart, Users, FileText } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Crop Management', icon: Sprout, href: '/crops' },
  { name: 'Livestock', icon: Cat, href: '/livestock' },
  { name: 'Inventory', icon: Package, href: '/inventory' },
  { name: 'Sales & Receipts', icon: ShoppingCart, href: '/sales' },
  { name: 'Employees & Tasks', icon: Users, href: '/employees' },
  { name: 'Reports', icon: FileText, href: '/reports' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-screen w-64 bg-green-900 text-white fixed left-0 top-0 flex flex-col z-50 shadow-2xl">
      {/* --- BIGGER LOGO --- */}
      <div className="p-4 flex items-center space-x-3 border-b border-green-800/50">
        <div className="w-14 h-14 flex items-center justify-center shrink-0">
           <Image 
             src="/farmslogo.svg"
             alt="Hughes Farms Logo" 
             width={56}
             height={56} 
             className="object-contain"
           />
        </div>
        <div>
          <h1 className="text-xl font-extrabold leading-tight tracking-tight">Hughes Farms</h1>
          <p className="text-[10px] text-green-300 font-medium opacity-80">Farm Management</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className={`flex items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-green-100/80 hover:bg-white/5 hover:text-white'}`}>
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-yellow-400' : ''}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-green-800/50 text-xs text-green-300">
        <p className="font-semibold">Version 1.0.0</p>
        <div className="flex items-center mt-2">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          Online Mode
        </div>
      </div>
    </div>
  );
}
