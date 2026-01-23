'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'; // Real-time DB updates
import { db } from '@/lib/db'; // Your local DB
import { toast } from 'sonner'; // Better notifications
import { 
  Sprout, MapPin, Calendar, BarChart3, Plus, X, 
  Droplets, Pencil, Scissors, DollarSign, Loader2,
  Trash2, AlertTriangle // ✅ ICONS FOR DELETE
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils';

// ✅ SAFE UUID GENERATOR
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


export default function CropManagement() {
  // ✅ Filter out deleted items so they disappear from the UI immediately
  const crops = useLiveQuery(() => 
    db.crops.filter(c => c.syncStatus !== 'deleted').toArray().then(rows => rows.reverse())
  ) || [];
  
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  
  const treatments = useLiveQuery(
    () => selectedCrop ? db.treatments.where('crop_id').equals(selectedCrop.id).reverse().toArray() : [],
    [selectedCrop?.id]
  ) || [];

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null); // ✅ State for delete modal

  function getCropStatus(plantingDate: string, harvestDate: string, actualYield: any) {
    if (actualYield && Number(actualYield) > 0) return 'Harvested';
    if (!plantingDate) return 'Unknown';
    const planted = new Date(plantingDate);
    const harvest = harvestDate ? new Date(harvestDate) : null;
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - planted.getTime());
    const daysSincePlanting = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (harvest && today >= harvest) return 'Ready to Harvest';
    if (daysSincePlanting <= 2) return 'Planted';
    return 'Growing';
  }

  async function handleSaveCrop(e: any) {
    e.preventDefault();
    const initialStatus: 'Growing' = 'Growing'; 
    const formData = {
      plot_number: e.target.plot_number.value,
      crop_type: e.target.crop_type.value,
      variety: e.target.variety.value,
      planting_date: e.target.planting_date.value,
      expected_harvest_date: e.target.expected_harvest_date.value,
      plot_size_acres: Number(e.target.plot_size_acres.value),
      location: e.target.location.value,
      estimated_yield_kg: Number(e.target.estimated_yield_kg.value),
      status: initialStatus,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editingCrop) {
        await db.crops.update(editingCrop.id, { ...formData, syncStatus: 'updated' });
        toast.success("Crop updated");
      } else {
        await db.crops.add({ id: generateUUID(), ...formData, createdAt: new Date().toISOString(), syncStatus: 'pending' } as any);
        toast.success("New crop planted!");
      }
      setIsCropModalOpen(false);
      setEditingCrop(null);
    } catch (err) {
      toast.error("Failed to save crop");
      console.error(err);
    }
  }

  // ✅ DELETION LOGIC ADDED
  async function handleDelete() {
    if (!confirmDelete) return;
    try {
        const crop = await db.crops.get(confirmDelete.id);
        if (crop && crop.syncStatus === 'pending') {
            await db.crops.delete(confirmDelete.id);
        } else {
            await db.crops.update(confirmDelete.id, { syncStatus: 'deleted', updatedAt: new Date().toISOString() });
        }
        toast.success(`Crop ${confirmDelete.plot_number} deleted.`);
        if (selectedCrop?.id === confirmDelete.id) {
            setSelectedCrop(null);
        }
    } catch (e) {
        toast.error("Failed to delete crop.");
    } finally {
        setConfirmDelete(null);
    }
  }
  
  async function handleSaveTreatment(e: any) {
    e.preventDefault();
    if (!selectedCrop) return;
    const formData = {
      crop_id: selectedCrop.id,
      treatment_type: e.target.treatment_type.value,
      product_name: e.target.product_name.value,
      treatment_date: e.target.treatment_date.value,
      quantity: e.target.quantity.value,
      cost: Number(e.target.cost.value),
      notes: e.target.notes.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    try {
      await db.treatments.add({ id: generateUUID(), ...formData } as any);
      toast.success("Treatment recorded");
      setIsTreatmentModalOpen(false);
    } catch (err) {
      toast.error("Could not save treatment");
    }
  }

  async function handleSaveYield(e: any) {
    e.preventDefault();
    if (!selectedCrop) return;
    const newStatus: 'Harvested' = 'Harvested';
    try {
        await db.crops.update(selectedCrop.id, {
            actual_yield_kg: Number(e.target.actual_yield.value),
            harvest_notes: e.target.harvest_notes.value,
            status: newStatus,
            syncStatus: 'updated',
            updatedAt: new Date().toISOString()
        });
        setSelectedCrop({
            ...selectedCrop,
            actual_yield_kg: Number(e.target.actual_yield.value),
            status: 'Harvested'
        });
        toast.success("Yield updated successfully");
        setIsYieldModalOpen(false);
    } catch (err) {
        toast.error("Failed to update yield");
    }
  }

  function openEditCrop(crop: any) {
    setEditingCrop(crop);
    setIsCropModalOpen(true);
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crop Management</h1>
          <p className="text-gray-500">Manage your farm plots and crop activities</p>
        </div>
        <button 
          onClick={() => { setEditingCrop(null); setIsCropModalOpen(true); }}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Crop
        </button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-4">
          {!crops && <div className="text-center py-10 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>}
          {crops && crops.length === 0 && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No crops planted yet.</p>
            </div>
          )}
          {crops?.map((crop: any) => {
            const status = getCropStatus(crop.planting_date, crop.expected_harvest_date, crop.actual_yield_kg);
            return (
            <div 
              key={crop.id}
              onClick={() => setSelectedCrop(crop)}
              className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md 
                ${selectedCrop?.id === crop.id ? 'border-primary-500 ring-1 ring-primary-500 shadow-md' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {crop.plot_number} <span className="text-gray-300 font-normal">|</span> {crop.crop_type}
                  </h3>
                  <p className="text-sm font-medium text-primary-700 mt-1">
                    {crop.variety}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{crop.location}</span>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{crop.plot_size_acres} acres</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Planted: {new Date(crop.planting_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )})}
        </div>
        {selectedCrop ? (
          <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4 animate-in slide-in-from-right-4 duration-300">
            <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedCrop.plot_number} Details</h2>
                <p className="text-gray-500 font-medium">{selectedCrop.crop_type} - {selectedCrop.variety}</p>
              </div>
              <div className="flex items-center gap-1">
                  <button onClick={() => openEditCrop(selectedCrop)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-primary-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmDelete(selectedCrop)} className="p-2 hover:bg-red-50 rounded-full text-gray-500 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
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
                  <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wide opacity-80">Recent Treatments</h4>
                  {treatments?.length === 0 && <p className="text-xs text-gray-400 italic">No treatments recorded.</p>}
                  {treatments?.map((t: any) => (
                      <div key={t.id} className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 text-sm font-bold text-blue-800"><Droplets className="w-3.5 h-3.5" /><span>{t.treatment_type}</span></div>
                              <span className="text-xs text-blue-600">{new Date(t.treatment_date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">{t.product_name} - {t.quantity}</p>
                          {t.notes && <p className="text-[10px] text-blue-500 mt-1 italic">"{t.notes}"</p>}
                      </div>
                  ))}
              </div>
              <div className="pt-2 space-y-3">
                <button onClick={() => setIsTreatmentModalOpen(true)} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors text-sm"><Plus className="w-4 h-4" /> Add Treatment</button>
                <button onClick={() => setIsYieldModalOpen(true)} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors text-sm"><Scissors className="w-4 h-4" /> Update Yield</button>
              </div>
            </div>
          </div>
        ) : (
            <div className="hidden lg:flex w-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-10 flex-col items-center justify-center text-gray-400 h-64 sticky top-4">
                <Sprout className="w-12 h-12 mb-2 opacity-20" /><p>Select a crop to view details</p>
            </div>
        )}
      </div>

      {confirmDelete && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl text-center animate-in zoom-in-95">
                 <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-500"/></div>
                 <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Crop?</h3>
                 <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete crop <strong>{confirmDelete.plot_number}</strong>? This will also delete all of its treatment history. This action cannot be undone.</p>
                 <div className="flex gap-3">
                     <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-bold text-gray-600 hover:bg-gray-200">Cancel</button>
                     <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Delete</button>
                 </div>
             </div>
         </div>
      )}

      {isCropModalOpen && (<Modal title={editingCrop ? "Edit Crop Details" : "Add New Crop"} onClose={() => setIsCropModalOpen(false)}> <form onSubmit={handleSaveCrop} className="space-y-4"><input name="plot_number" required defaultValue={editingCrop?.plot_number} type="text" placeholder="Plot Number (e.g. A001)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /><input name="crop_type" required defaultValue={editingCrop?.crop_type} type="text" placeholder="Crop Type (e.g. Maize)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /><div className="grid grid-cols-2 gap-4"><input name="variety" defaultValue={editingCrop?.variety} type="text" placeholder="Variety" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /><input name="plot_size_acres" required defaultValue={editingCrop?.plot_size_acres} type="number" step="0.1" placeholder="Size (acres)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /></div><div className="grid grid-cols-2 gap-4"><input name="location" defaultValue={editingCrop?.location} type="text" placeholder="Location" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /><input name="estimated_yield_kg" defaultValue={editingCrop?.estimated_yield_kg} type="number" placeholder="Est. Yield (kg)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs text-gray-500 font-bold ml-1 uppercase">Planting Date</label><input name="planting_date" required defaultValue={editingCrop ? new Date(editingCrop.planting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-primary-500" /></div><div className="space-y-1"><label className="text-xs text-gray-500 font-bold ml-1 uppercase">Exp. Harvest</label><input name="expected_harvest_date" defaultValue={editingCrop?.expected_harvest_date ? new Date(editingCrop.expected_harvest_date).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-primary-500" /></div></div><button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold mt-4">{editingCrop ? "Update Crop" : "Save Crop"}</button></form> </Modal>)}
      {isYieldModalOpen && selectedCrop && (<Modal title="Update Yield" onClose={() => setIsYieldModalOpen(false)}> <form onSubmit={handleSaveYield} className="space-y-4"><div className="bg-gray-50 p-3 rounded-lg mb-4"><p className="text-sm text-gray-500">Estimated Yield</p><p className="text-xl font-bold text-gray-800">{selectedCrop.estimated_yield_kg} kg</p></div><div className="space-y-1"><label className="text-sm font-bold text-gray-700">Actual Yield (kg)</label><input name="actual_yield" type="number" required defaultValue={selectedCrop.actual_yield_kg} placeholder="Enter actual yield" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /></div><div className="space-y-1"><textarea name="harvest_notes" rows={3} defaultValue={selectedCrop.harvest_notes} placeholder="Harvest notes (optional)" className="w-full border p-3 rounded-lg resize-none outline-none focus:border-primary-500" /></div><div className="flex gap-4 mt-4"><button type="button" onClick={() => setIsYieldModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">Cancel</button><button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-bold">Update Yield</button></div></form> </Modal>)}
      {isTreatmentModalOpen && (<Modal title="Add Treatment" onClose={() => setIsTreatmentModalOpen(false)}> <form onSubmit={handleSaveTreatment} className="space-y-4"><select name="treatment_type" className="w-full border p-3 rounded-lg bg-white outline-none focus:border-primary-500"><option>Fertilizer</option><option>Pesticide</option><option>Irrigation</option><option>Pruning</option><option>Other</option></select><input name="product_name" type="text" placeholder="Product Name (e.g. NPK 15-15-15)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /><div className="space-y-1"><label className="text-xs text-gray-500 font-bold ml-1 uppercase">Date</label><input name="treatment_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-primary-500" /></div><div className="grid grid-cols-2 gap-4"><input name="quantity" type="text" placeholder="Quantity (e.g. 50kg)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" /><div className="relative"><DollarSign className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" /><input name="cost" type="number" step="0.01" placeholder="Cost" className="w-full border pl-9 p-3 rounded-lg outline-none focus:border-primary-500" /></div></div><textarea name="notes" placeholder="Notes (optional)" rows={3} className="w-full border p-3 rounded-lg resize-none outline-none focus:border-primary-500" /><button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold">Save Treatment</button></form> </Modal>)}
    </div>
  );
}

// ✅ ALL HELPER COMPONENTS RESTORED WITH THEIR RETURN VALUES
function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    growing: 'bg-yellow-100 text-yellow-700',
    planted: 'bg-primary-50 text-primary-700',
    harvested: 'bg-blue-100 text-blue-700',
    ready: 'bg-orange-100 text-orange-700'
  };
  const key = status?.toLowerCase().includes('ready') ? 'ready' : status?.toLowerCase();
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[key] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}

function DetailSection({ title, children }: any) {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide opacity-80">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, capitalize }: any) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <div className={`font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            {children}
          </div>
        </div>
    );
}
