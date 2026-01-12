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
    <div className="h-screen w-64 bg-green-900 text-white fixed left-0 top-0 flex flex-col z-50 shadow-xl">
      {/* Branding */}
      <div className="p-6 flex items-center space-x-3 border-b border-green-800">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
           <Image 
             src="/farmslogo.png" 
             alt="Hughes Farms Logo" 
             width={40} 
             height={40} 
             className="object-cover"
           />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Hughes Farms</h1>
          <p className="text-[10px] text-green-300 font-medium">Farm Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-6 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-green-800 text-white shadow-md translate-x-1' 
                  : 'text-green-100 hover:bg-green-800/50 hover:text-white'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-yellow-400' : ''}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-green-800 text-xs text-green-400">
        <p className="font-semibold">Version 1.0.0</p>
        <div className="flex items-center mt-2">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Online Mode
        </div>
      </div>
    </div>
  );
}
