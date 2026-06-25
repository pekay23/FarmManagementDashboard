'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, RefreshCw, Server, User, Database, Globe, Download, LogOut, Smartphone, Wifi, WifiOff, Upload } from 'lucide-react';
import { db } from '@/lib/db';
import { signOut, useSession } from 'next-auth/react';
import { useSync } from '@/context/SyncContext';
import packageInfo from '../../package.json';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    farm_name: '',
    logo: '', 
    phone: '',
    email: '',
    address: '',
    receipt_footer: '',
    tax_rate: 0,
    working_hours: '',
    show_contact_on_pdf: true
  });
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const { isOnline, isSyncing } = useSync();
  const [isPWA, setIsPWA] = useState(false);
  const [dbInfo, setDbInfo] = useState({ name: 'Loading...', version: 0, tables: 0 });
  const isSuperAdmin = (session?.user as any)?.is_superadmin;

  useEffect(() => {
    async function fetchSettings() {
        try {
            // ✅ Fix: Prevent caching
            const res = await fetch('/api/settings', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({
                    ...prev,
                    ...data,
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    receipt_footer: data.receipt_footer || '',
                    logo: data.logo || '',
                    tax_rate: data.tax_rate || 0,
                    working_hours: data.working_hours || '',
                    show_contact_on_pdf: data.show_contact_on_pdf !== undefined ? data.show_contact_on_pdf : true
                }));
            }
        } catch {
            console.error("Failed to load settings");
        }
    }
    fetchSettings();

    if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        queueMicrotask(() => setIsPWA(isStandalone));
    }

    async function getDbStats() {
        if (db) {
            setDbInfo({
                name: db.name,
                version: db.verno,
                tables: db.tables.length
            });
        }
    }
    getDbStats();
  }, []);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLogoUpload = (e: any) => {
      const file = e.target.files[0];
      if (file) {
          // ✅ Fix: Limit file size to 800KB to prevent Payload Too Large errors
          if (file.size > 800 * 1024) {
              toast.error("Image too large. Please use an image under 800KB.");
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, logo: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        if (navigator.onLine) {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            // ✅ Fix: Explicitly check for server error
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Server failed to save settings");
            }

            toast.success("Configuration saved! Reloading...");
            setTimeout(() => window.location.reload(), 1000); 
        } else {
            toast.error("You must be online to update farm configuration.");
        }
    } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to save settings");
    } finally {
        setLoading(false);
    }
  };

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
      } catch {
          toast.error("Failed to create backup");
      }
  };

  const handleHardReset = async () => {
      if (!confirm("This will wipe all data on this device and re-download fresh data from the server. Any unsynced offline changes will be LOST. Continue?")) return;
      
      try {
          setLoading(true);
          await db.delete(); 
          await db.open();   
          toast.success("Database reset. Reloading...");
          setTimeout(() => {
              window.location.href = '/'; 
          }, 1000);
      } catch {
          toast.error("Failed to reset database");
          setLoading(false);
      }
  };

  const renderTabButton = (id: string, label: string, Icon: any) => (
      <button 
        key={id}
        onClick={() => setActiveTab(id)}
        className={`w-full p-3 rounded-lg font-medium flex items-center gap-3 transition-colors text-left ${
            activeTab === id 
            ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200" 
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
          <Icon className="w-5 h-5" /> {label}
      </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-20">
      <h1 className="text-2xl font-bold text-card-foreground mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
              {renderTabButton("general", "General", Globe)}
              {renderTabButton("account", "Account", User)}
              {renderTabButton("backup", "Backup & Data", Database)}
              {renderTabButton("api", "System Info", Server)}
          </div>

          <div className="md:col-span-3 bg-card p-6 rounded-xl shadow-sm border border-border min-h-[400px]">
              
              {activeTab === 'general' && (
                  <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-card-foreground border-b pb-2">Farm Configuration</h2>
                      
                      <div className="flex items-center gap-6">
                          <div className="w-24 h-24 bg-secondary rounded-xl flex items-center justify-center border-2 border-dashed border-border overflow-hidden relative">
                              {formData.logo ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                  <span className="text-xs text-muted-foreground">No Logo</span>
                              )}
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-foreground mb-2">Farm Logo</label>
                              <label className="cursor-pointer bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 w-fit">
                                  <Upload className="w-4 h-4" /> Upload Image
                                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                              </label>
                              <p className="text-xs text-muted-foreground mt-2">Recommended: Square PNG/JPG, max 800KB.</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Farm Name</label>
                              <input name="farm_name" value={formData.farm_name || ''} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="e.g. North Ridge Farm" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone Number</label>
                              <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="+233..." />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address</label>
                          <input name="email" value={formData.email || ''} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Address</label>
                              <textarea name="address" rows={2} value={formData.address || ''} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 resize-none" placeholder="123 Farm Lane" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Working Hours</label>
                              <textarea name="working_hours" rows={2} value={formData.working_hours || ''} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 resize-none" placeholder="Mon - Fri: 8am - 5pm" />
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Receipt Footer</label>
                              <input name="receipt_footer" value={formData.receipt_footer || ''} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Tax Rate (%)</label>
                              <input name="tax_rate" type="number" step="0.1" value={formData.tax_rate || 0} onChange={handleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                          </div>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                          <input type="checkbox" id="show_contact" name="show_contact_on_pdf" checked={formData.show_contact_on_pdf} onChange={handleChange} className="w-5 h-5 accent-primary-600 rounded cursor-pointer" />
                          <label htmlFor="show_contact" className="text-sm font-bold text-foreground cursor-pointer">Include Contact Info & Working Hours on PDF Reports/Receipts</label>
                      </div>
                      <div className="pt-4 flex justify-end">
                          <button disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors">
                              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                              Save Changes
                          </button>
                      </div>
                  </form>
              )}

              {activeTab === 'account' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-card-foreground border-b pb-2">Account Details</h2>
                      <div className="p-4 bg-muted rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Logged in as</p>
                          <p className="text-lg font-medium text-card-foreground">{session?.user?.email || 'Offline User'}</p>
                          <p className="text-sm text-muted-foreground mt-1">Role: <span className="font-semibold text-primary-700">{(session?.user as any)?.is_superadmin ? 'Super Admin' : 'Farm Owner'}
</span></p>

                      </div>
                      <div className="flex gap-4 pt-2">
                          <button onClick={() => window.location.href='/profile'} className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted font-medium transition-colors">
                              Change Password
                          </button>
                          <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 font-medium flex items-center gap-2 transition-colors">
                              <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                      </div>
                  </div>
              )}

              {activeTab === 'backup' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-card-foreground border-b pb-2">Data Management</h2>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-xl border-border hover:border-primary-200 transition-colors">
                            <h3 className="font-bold text-card-foreground mb-1">Export Data</h3>
                            <p className="text-sm text-muted-foreground mb-3">Download a JSON backup of all farm data stored on this device.</p>
                            <button onClick={handleBackup} className="px-4 py-2 bg-secondary hover:bg-secondary/60 text-foreground rounded-lg text-sm font-bold flex items-center gap-2">
                                <Download className="w-4 h-4" /> Download Backup
                            </button>
                        </div>

                        <div className="p-4 border rounded-xl border-red-200 bg-red-50/30">
                            <h3 className="font-bold text-red-800 mb-1 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Troubleshooting
                            </h3>
                            <p className="text-sm text-red-700 mb-3">
                                If data isn&apos;t syncing or you see &quot;ghost&quot; items, use this to clear the local database and re-fetch everything from the server.
                            </p>
                            <button onClick={handleHardReset} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Clear Data & Resync
                            </button>
                        </div>
                      </div>
                  </div>
              )}

              {activeTab === 'api' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-card-foreground border-b pb-2">System Information</h2>
                      <div className="space-y-0 text-sm">
                          <div className="flex justify-between py-3 border-b border-border">
                              <span className="text-muted-foreground">App Version</span>
                              <span className="font-mono bg-secondary px-2 py-0.5 rounded">v{packageInfo.version}</span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-border">
                              <span className="text-muted-foreground">Connection</span>
                              <span className={`font-bold flex items-center gap-2 ${isOnline ? 'text-green-600' : 'text-orange-500'}`}>
                                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                  {isOnline ? 'Online' : 'Offline Mode'}
                              </span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-border">
                              <span className="text-muted-foreground">Sync Status</span>
                              <span className={`font-mono ${isSyncing ? 'text-blue-600 animate-pulse' : 'text-muted-foreground'}`}>
                                  {isSyncing ? 'Syncing...' : 'Idle'}
                              </span>
                          </div>
                          <div className="flex justify-between py-3 border-b border-border">
                              <span className="text-muted-foreground">PWA Mode</span>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <Smartphone className={`w-4 h-4 ${isPWA ? 'text-green-500' : 'text-muted-foreground'}`} />
                                  <span className={`font-mono ${isPWA ? 'text-green-700' : 'text-muted-foreground'}`}>
                                      {isPWA ? 'Installed App' : 'Browser'}
                                  </span>
                                </div>
                                {!isPWA && (
                                  <p className="text-xs text-muted-foreground text-right max-w-xs mt-1">
                                    <strong>Mobile Users:</strong> Tap <strong className="text-muted-foreground">Share</strong> &gt; <strong className="text-muted-foreground">Add to Home Screen</strong> (iOS) or <strong className="text-muted-foreground">Install App</strong> (Android) for offline mode & fullscreen.
                                  </p>
                                )}
                              </div>
                          </div>
                          {isSuperAdmin && (
                            <>
                              <div className="flex justify-between py-3 border-b border-border">
                                  <span className="text-muted-foreground">Database Engine</span>
                                  <span className="font-mono text-foreground flex items-center gap-2">
                                    <Database className="w-3 h-3" /> Dexie.js (IndexedDB)
                                  </span>
                              </div>
                              <div className="flex justify-between py-3">
                                  <span className="text-muted-foreground">Local DB Status</span>
                                  <span className="font-mono text-muted-foreground text-xs">
                                    {dbInfo.name} v{dbInfo.version} ({dbInfo.tables} tables)
                                  </span>
                              </div>
                            </>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}

function AlertTriangle(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <path d="M12 9v4"></path>
            <path d="M12 17h.01"></path>
        </svg>
    )
}
