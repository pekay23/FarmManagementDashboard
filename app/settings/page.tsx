'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, RefreshCw, Server, User, Database, Globe, Download, LogOut } from 'lucide-react';
import { db } from '@/lib/db';
import { signOut, useSession } from 'next-auth/react';

export default function SettingsPage() {
  // 1. Tab State
  const [activeTab, setActiveTab] = useState('general');

  // General Settings State
  const [formData, setFormData] = useState({
    farm_name: '',
    phone: '',
    email: '',
    address: '',
    receipt_footer: '',
    tax_rate: 0
  });
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  // Load Settings
  useEffect(() => {
    const saved = localStorage.getItem('farmSettings');
    if (saved) {
        setFormData(JSON.parse(saved));
    }
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    // Always save locally first (Offline Source of Truth)
    localStorage.setItem('farmSettings', JSON.stringify(formData));
    
    try {
        if (navigator.onLine) {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            toast.success("Settings saved & synced to cloud");
        } else {
            toast.success("Settings saved locally (Offline)");
        }
    } catch (err) {
        toast.warning("Saved locally only");
    } finally {
        setLoading(false);
    }
  };

  // Backup Function: Dumps local DB to JSON file
  const handleBackup = async () => {
      try {
        const data = {
            crops: await db.crops.toArray(),
            livestock: await db.livestock.toArray(),
            inventory: await db.inventory.toArray(),
            sales: await db.sales.toArray(),
            tasks: await db.tasks.toArray(),
            settings: formData,
            date: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hughes_farm_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Backup downloaded successfully");
      } catch (e) {
          toast.error("Failed to create backup");
      }
  };

  // Tab Navigation Helper Component
  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`w-full p-3 rounded-lg font-medium flex items-center gap-3 transition-colors text-left ${
            activeTab === id 
            ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200" 
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
          <Icon className="w-5 h-5" /> {label}
      </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Sidebar Tabs */}
          <div className="space-y-2">
              <TabButton id="general" label="General" icon={Globe} />
              <TabButton id="account" label="Account" icon={User} />
              <TabButton id="backup" label="Backup & Data" icon={Database} />
              <TabButton id="api" label="System Info" icon={Server} />
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
              
              {/* --- GENERAL TAB --- */}
              {activeTab === 'general' && (
                  <form onSubmit={handleSave} className="space-y-5 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Farm Configuration</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Farm Name</label>
                              <input name="farm_name" value={formData.farm_name} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="e.g. Hughes Farms" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="+233..." />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                          <input name="email" value={formData.email} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                          <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 resize-none" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Footer</label>
                              <input name="receipt_footer" value={formData.receipt_footer} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax Rate (%)</label>
                              <input name="tax_rate" type="number" step="0.1" value={formData.tax_rate} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                          </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                          <button disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors">
                              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                              Save Changes
                          </button>
                      </div>
                  </form>
              )}

              {/* --- ACCOUNT TAB --- */}
              {activeTab === 'account' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Account Details</h2>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Logged in as</p>
                          <p className="text-lg font-medium text-gray-900">{session?.user?.email || 'Offline User'}</p>
                          <p className="text-sm text-gray-500 mt-1">Role: Administrator</p>
                      </div>
                      <div className="flex gap-4 pt-2">
                          <button onClick={() => window.location.href='/profile'} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                              Change Password
                          </button>
                          <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 font-medium flex items-center gap-2 transition-colors">
                              <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                      </div>
                  </div>
              )}

              {/* --- BACKUP TAB --- */}
              {activeTab === 'backup' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Data Management</h2>
                      <p className="text-gray-600 text-sm">
                          Your data is stored securely on this device for offline access. 
                          You can download a full backup of your farm data (Crops, Livestock, Inventory, Sales) as a JSON file.
                      </p>
                      <button onClick={handleBackup} className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group flex flex-col items-center justify-center gap-2">
                          <div className="bg-white p-3 rounded-full shadow-sm group-hover:shadow-md">
                             <Download className="w-8 h-8 text-gray-400 group-hover:text-primary-600" />
                          </div>
                          <span className="font-bold text-gray-700 group-hover:text-primary-700">Download Local Backup</span>
                          <span className="text-xs text-gray-400">JSON Format • All Tables</span>
                      </button>
                  </div>
              )}

              {/* --- SYSTEM TAB --- */}
              {activeTab === 'api' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-gray-800 border-b pb-2">System Information</h2>
                      <div className="space-y-0 text-sm">
                          <div className="flex justify-between py-3 border-b border-gray-50">
                              <span className="text-gray-500">App Version</span>
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">v1.2.0 (Offline-First)</span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-gray-50">
                              <span className="text-gray-500">Connection</span>
                              <span className={`font-bold flex items-center gap-2 ${navigator.onLine ? 'text-green-600' : 'text-orange-500'}`}>
                                  <span className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-orange-500'}`}></span> 
                                  {navigator.onLine ? 'Online' : 'Offline Mode'}
                              </span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-gray-50">
                              <span className="text-gray-500">PWA Status</span>
                              <span className="font-mono text-gray-700">Active</span>
                          </div>
                          <div className="flex justify-between py-3">
                              <span className="text-gray-500">Database</span>
                              <span className="font-mono text-gray-700">Dexie.js (IndexedDB)</span>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </div>
    </div>
  );
}
