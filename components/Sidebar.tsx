// components/Sidebar.tsx
import Link from 'next/link';
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
  return (
    <div className="h-screen w-64 bg-green-900 text-white fixed left-0 top-0 flex flex-col z-50">
      {/* Branding */}
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-yellow-400 rounded-md flex items-center justify-center">
          <Sprout className="text-green-900 w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Hughes Farms</h1>
          <p className="text-xs text-green-300">Farm Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-green-800 text-xs text-green-400">
        <p>Version 1.0.0</p>
        <div className="flex items-center mt-2">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Online Mode
        </div>
      </div>
    </div>
  );
}
