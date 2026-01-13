'use client';

import { useState, useEffect } from 'react';
import { 
  Sprout, MapPin, Calendar, BarChart3, Plus, X, Droplets, 
  Pencil, Scissors, DollarSign, Wifi, WifiOff, RefreshCw 
} from 'lucide-react';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

export default function CropManagement() {
  // Safe local query
  const crops = useLiveQuery(() => db.crops.toArray()) || [];
  
  // Load treatments for all crops (in a real app, query only selected)
  // We use useLiveQuery for selected crop treatments to keep UI reactive
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  
  const selectedCrop = crops.find(c => c.id === selectedCropId);
  
  const treatments = useLiveQuery(
    () => selectedCropId ? db.crop_treatments.where('crop_local_id').equals(selectedCropId).toArray() : [],
    [selectedCropId]
  ) || [];

  // Modals
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<any>(null);

  // Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => { setIsOnline(true); runSync(); });
        window.addEventListener('offline', () => setIsOnline(false));
    }
    runSync();
  }, []);

  async function runSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncing(true);
    try {
        await syncTable('crops', '/api/crops');
        await syncTable('crop_treatments', '/api/crops/treatments'); // Assuming API endpoint
        await fetchAndCache('crops', '/api/crops');
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  }

  // --- LOGIC ---
  function getCropStatus(plantingDate: string, harvestDate: string, actualYield: any) {
    if (actualYield && Number(actualYield) > 0) return 'harvested';
    if (!plantingDate) return 'unknown';

    const planted = new Date(plantingDate);
    const harvest = harvestDate ? new Date(harvestDate) : null;
    const today = new Date();
    
    const diffTime = Math.abs(today.getTime() - planted.getTime());
    const daysSincePlanting = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (harvest && today >= harvest) return 'harvested';
    if (daysSincePlanting <= 2) return 'planted';
    return 'growing';
  }

  // --- HANDLERS ---
  function openUpdateYield() {
    setIsYieldModalOpen(true);
  }

  async function handleSaveCrop(e: any) {
    e.preventDefault();
    const newItem = {
      plot_number: e.target.plot_number.value,
      crop_type: e.target.crop_type.value,
      variety: e.target.variety.value,
      planting_date: e.target.planting_date.value,
      expected_harvest_date: e.target.expected_harvest_date.value,
      plot_size_acres: parseFloat(e.target.plot_size_acres.value),
      location: e.target.location.value,
      estimated_yield_kg: parseFloat(e.target.estimated_yield_kg.value),
      status: 'growing',
      sync_status: editingCrop ? 'pending_update' : 'pending_create'
    };

    if (editingCrop) {
        await db.crops.update(editingCrop.id, newItem);
    } else {
        await db.crops.add(newItem as any);
    }
    
    setIsCropModalOpen(false);
    runSync();
  }

  async function handleSaveTreatment(e: any) {
    e.preventDefault();
    if (!selectedCropId) return;

    const newItem = {
      crop_local_id: selectedCropId,
      treatment_type: e.target.treatment_type.value,
      product_name: e.target.product_name.value,
      treatment_date: e.target.treatment_date.value,
      quantity: e.target.quantity.value,
      cost: parseFloat(e.target.cost.value),
      notes: e.target.notes.value,
      sync_status: 'pending_create'
    };
    
    await db.crop_treatments.add(newItem as any);
    setIsTreatmentModalOpen(false);
    runSync();
  }

  async function handleSaveYield(e: any) {
    e.preventDefault();
    if (!selectedCropId) return;

    await db.crops.update(selectedCropId, {
        actual_yield_kg: parseFloat(e.target.actual_yield.value),
        harvest_notes: e.target.harvest_notes.value,
        status: 'harvested',
        sync_status: 'pending_update'
    });

    setIsYieldModalOpen(false);
    runSync();
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crop Management</h1>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? 
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Wifi className="w-3 h-3"/> Online</span> : 
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3"/> Offline Mode</span>
            }
            {isSyncing && <span className="text-xs text-blue-500 flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Syncing...</span>}
          </div>
        </div>
        <button 
          onClick={() => { setEditingCrop(null); setIsCropModalOpen(true); }}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Crop
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* List */}
        <div className="flex-1 w-full space-y-4">
          {crops.length === 0 && <p className="text-center text-gray-400 py-10">No crops added yet.</p>}
          {crops.map((crop: any) => (
            <div 
              key={crop.id}
              onClick={() => setSelectedCropId(crop.id)}
              className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md 
                ${selectedCropId === crop.id ? 'border-green-500 ring-1 ring-green-500 shadow-md' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {crop.plot_number} 
                    {crop.sync_status !== 'synced' && <span className="w-2 h-2 rounded-full bg-orange-500" title="Pending Sync"></span>}
                  </h3>
                  <p className="text-sm font-medium text-green-700 mt-1">{crop.variety}</p>
                </div>
                <StatusBadge status={getCropStatus(crop.planting_date, crop.expected_harvest_date, crop.actual_yield_kg)} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-gray-600"><BarChart3 className="w-3.5 h-3.5" /><span>{crop.plot_size_acres} acres</span></div>
                <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-3.5 h-3.5" /><span>{new Date(crop.planting_date).toLocaleDateString()}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Details Panel */}
        {selectedCrop ? (
          <div className="w-full md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-0 self-start">
            <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
              <div><h2 className="text-xl font-bold text-gray-800">{selectedCrop.plot_number} Details</h2></div>
              <button onClick={() => { setEditingCrop(selectedCrop); setIsCropModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-6">
              <DetailSection title="Plot Information">
                <DetailRow label="Location" value={selectedCrop.location} />
                <DetailRow label="Size" value={`${selectedCrop.plot_size_acres} acres`} />
                <DetailRow label="Status" value={getCropStatus(selectedCrop.planting_date, selectedCrop.expected_harvest_date, selectedCrop.actual_yield_kg)} capitalize />
              </DetailSection>

              <DetailSection title="Timeline">
                 <DetailRow label="Planted" value={new Date(selectedCrop.planting_date).toLocaleDateString()} />
                 <DetailRow label="Exp. Harvest" value={selectedCrop.expected_harvest_date ? new Date(selectedCrop.expected_harvest_date).toLocaleDateString() : 'N/A'} />
              </DetailSection>

              <DetailSection title="Yield Tracking">
                <DetailRow label="Estimated" value={`${selectedCrop.estimated_yield_kg} kg`} />
                <DetailRow label="Actual" value={selectedCrop.actual_yield_kg ? `${selectedCrop.actual_yield_kg} kg` : 'Not harvested'} />
              </DetailSection>

              <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide opacity-80">Local Treatments</h4>
                  {treatments.length === 0 && <p className="text-xs text-gray-400 italic">No treatments recorded locally.</p>}
                  {treatments.map((t: any, i: number) => (
                      <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 text-sm font-bold text-blue-800"><Droplets className="w-3.5 h-3.5" /><span>{t.treatment_type}</span></div>
                              <span className="text-xs text-blue-600">{new Date(t.treatment_date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">{t.product_name} - {t.quantity}</p>
                      </div>
                  ))}
              </div>

              <div className="pt-2 space-y-3">
                <button onClick={() => setIsTreatmentModalOpen(true)} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Treatment</button>
                <button onClick={openUpdateYield} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 text-sm"><Scissors className="w-4 h-4" /> Update Yield</button>
              </div>
            </div>
          </div>
        ) : (
            <div className="hidden md:flex w-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-10 flex-col items-center justify-center text-gray-400 h-64 sticky top-0">
                <Sprout className="w-12 h-12 mb-2 opacity-20" />
                <p>Select a crop to view details</p>
            </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {isCropModalOpen && (
        <Modal title={editingCrop ? "Edit Crop" : "Add Crop"} onClose={() => setIsCropModalOpen(false)}>
            <form onSubmit={handleSaveCrop} className="space-y-4">
              <input name="plot_number" required defaultValue={editingCrop?.plot_number} placeholder="Plot Number" className="w-full border p-3 rounded-lg outline-none" />
              <input name="crop_type" required defaultValue={editingCrop?.crop_type} placeholder="Crop Type" className="w-full border p-3 rounded-lg outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input name="variety" defaultValue={editingCrop?.variety} placeholder="Variety" className="w-full border p-3 rounded-lg outline-none" />
                <input name="plot_size_acres" required defaultValue={editingCrop?.plot_size_acres} type="number" step="0.1" placeholder="Size (acres)" className="w-full border p-3 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <input name="location" defaultValue={editingCrop?.location} placeholder="Location" className="w-full border p-3 rounded-lg outline-none" />
                 <input name="estimated_yield_kg" defaultValue={editingCrop?.estimated_yield_kg} type="number" placeholder="Est. Yield (kg)" className="w-full border p-3 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="planting_date" required defaultValue={editingCrop ? new Date(editingCrop.planting_date).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg outline-none" />
                <input name="expected_harvest_date" defaultValue={editingCrop?.expected_harvest_date ? new Date(editingCrop.expected_harvest_date).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg outline-none" />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-4">Save Locally</button>
            </form>
        </Modal>
      )}

      {isTreatmentModalOpen && (
        <Modal title="Add Treatment" onClose={() => setIsTreatmentModalOpen(false)}>
            <form onSubmit={handleSaveTreatment} className="space-y-4">
                <select name="treatment_type" className="w-full border p-3 rounded-lg bg-white outline-none"><option>Fertilizer</option><option>Pesticide</option><option>Irrigation</option></select>
                <input name="product_name" placeholder="Product Name" className="w-full border p-3 rounded-lg outline-none" />
                <input name="treatment_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none" />
                <div className="grid grid-cols-2 gap-4">
                    <input name="quantity" placeholder="Quantity" className="w-full border p-3 rounded-lg outline-none" />
                    <input name="cost" type="number" step="0.01" placeholder="Cost" className="w-full border p-3 rounded-lg outline-none" />
                </div>
                <textarea name="notes" placeholder="Notes" rows={2} className="w-full border p-3 rounded-lg resize-none outline-none" />
                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Locally</button>
            </form>
        </Modal>
      )}

      {isYieldModalOpen && (
        <Modal title="Update Yield" onClose={() => setIsYieldModalOpen(false)}>
            <form onSubmit={handleSaveYield} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg mb-4"><p className="text-sm text-gray-500">Est. Yield: {selectedCrop?.estimated_yield_kg ?? 0} kg</p></div>
                <input name="actual_yield" type="number" required placeholder="Actual Yield (kg)" className="w-full border p-3 rounded-lg outline-none" />
                <textarea name="harvest_notes" rows={3} placeholder="Notes" className="w-full border p-3 rounded-lg resize-none outline-none" />
                <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold">Update Locally</button>
            </form>
        </Modal>
      )}
    </div>
  );
}

// Helpers
function StatusBadge({ status }: { status: string }) {
  const styles: any = { growing: 'bg-yellow-100 text-yellow-700', planted: 'bg-green-100 text-green-700', harvested: 'bg-blue-100 text-blue-700' };
  return <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[status?.toLowerCase()] || 'bg-gray-100'}`}>{status}</span>;
}
function DetailSection({ title, children }: any) { return <div><h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide opacity-80">{title}</h4><div className="space-y-3">{children}</div></div>; }
function DetailRow({ label, value, capitalize }: any) { return <div className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0"><span className="text-gray-500">{label}</span><span className={`font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</span></div>; }
function Modal({ title, onClose, children }: any) { return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4"><h2 className="text-xl font-bold text-gray-900">{title}</h2><button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button></div>{children}</div></div>; }
