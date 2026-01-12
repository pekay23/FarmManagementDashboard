'use client';

import { useState, useEffect } from 'react';
import { Sprout, MapPin, Calendar, BarChart3, Plus, X, Droplets, Pencil, Scissors, DollarSign } from 'lucide-react';

export default function CropManagement() {
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const [treatments, setTreatments] = useState<any[]>([]);
  
  // Modals
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false);
  
  // Editing State
  const [editingCrop, setEditingCrop] = useState<any>(null);

  // Load Crops
  useEffect(() => {
    fetchCrops();
  }, []);

  // Load Treatments when a crop is selected
  useEffect(() => {
    if (selectedCrop) {
      fetchTreatments(selectedCrop.id);
    }
  }, [selectedCrop]);

  async function fetchCrops() {
    try {
      const res = await fetch('/api/crops');
      const data = await res.json();
      if (Array.isArray(data)) setCrops(data);
    } catch (e) { console.error(e); }
  }

  async function fetchTreatments(cropId: string) {
    try {
      const res = await fetch(`/api/treatments?crop_id=${cropId}`);
      const data = await res.json();
      if (Array.isArray(data)) setTreatments(data);
    } catch (e) { console.error(e); }
  }

  // --- LOGIC: Calculate Status Automatically ---
  function getCropStatus(plantingDate: string, harvestDate: string, actualYield: any) {
    if (actualYield && Number(actualYield) > 0) return 'harvested';
    if (!plantingDate) return 'unknown';
    
    const planted = new Date(plantingDate);
    const harvest = harvestDate ? new Date(harvestDate) : null;
    const today = new Date();

    const diffTime = Math.abs(today.getTime() - planted.getTime());
    const daysSincePlanting = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (harvest && today >= harvest) {
        return 'harvested';
    }
    if (daysSincePlanting <= 2) {
        return 'planted';
    }
    return 'growing';
  }

  // --- HANDLERS ---

  function openAddCrop() {
    setEditingCrop(null);
    setIsCropModalOpen(true);
  }

  function openEditCrop(crop: any) {
    setEditingCrop(crop);
    setIsCropModalOpen(true);
  }

  function openUpdateYield() {
    setIsYieldModalOpen(true);
  }

  async function handleSaveCrop(e: any) {
    e.preventDefault();
    const formData = {
      plot_number: e.target.plot_number.value,
      crop_type: e.target.crop_type.value,
      variety: e.target.variety.value,
      planting_date: e.target.planting_date.value,
      expected_harvest_date: e.target.expected_harvest_date.value,
      plot_size_acres: e.target.plot_size_acres.value,
      location: e.target.location.value,
      estimated_yield_kg: e.target.estimated_yield_kg.value,
      status: 'growing'
    };

    const method = editingCrop ? 'PUT' : 'POST';
    const body = editingCrop ? { ...formData, id: editingCrop.id } : formData;

    const res = await fetch('/api/crops', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
        fetchCrops();
        setIsCropModalOpen(false);
        if (editingCrop && selectedCrop && editingCrop.id === selectedCrop.id) {
            setSelectedCrop({ ...selectedCrop, ...formData });
        }
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
      cost: e.target.cost.value,
      notes: e.target.notes.value
    };

    const res = await fetch('/api/treatments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
        fetchTreatments(selectedCrop.id);
        setIsTreatmentModalOpen(false);
    }
  }

  async function handleSaveYield(e: any) {
    e.preventDefault();
    if (!selectedCrop) return;

    const actualYield = e.target.actual_yield.value;
    const notes = e.target.harvest_notes.value;

    const body = {
        ...selectedCrop,
        actual_yield_kg: actualYield,
        harvest_notes: notes,
        status: 'harvested'
    };

    const res = await fetch('/api/crops', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
        fetchCrops();
        setSelectedCrop(body);
        setIsYieldModalOpen(false);
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Header Row */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crop Management</h1>
          <p className="text-gray-500">Manage your farm plots and crop activities</p>
        </div>
        <button 
          onClick={openAddCrop}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Crop
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Crop List */}
        <div className="flex-1 w-full space-y-4">
          {crops.length === 0 && <p className="text-gray-400 text-center py-10">No crops added yet.</p>}
          {crops.map((crop) => {
            const status = getCropStatus(crop.planting_date, crop.expected_harvest_date, crop.actual_yield_kg);
            return (
            <div 
              key={crop.id}
              onClick={() => setSelectedCrop(crop)}
              className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md 
                ${selectedCrop?.id === crop.id ? 'border-green-500 ring-1 ring-green-500 shadow-md' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {crop.plot_number} <span className="text-gray-400 font-normal">|</span> {crop.crop_type}
                  </h3>
                  <p className="text-sm font-medium text-green-700 mt-1">
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

        {/* RIGHT COLUMN: Details Panel */}
        {selectedCrop ? (
          <div className="w-full md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-0 animate-in slide-in-from-right-4 duration-300 self-start">
            <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedCrop.plot_number} Details</h2>
                  <p className="text-gray-500 font-medium">{selectedCrop.crop_type} - {selectedCrop.variety}</p>
              </div>
              <button onClick={() => openEditCrop(selectedCrop)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors">
                  <Pencil className="w-4 h-4" />
              </button>
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

              {/* Treatments List */}
              <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide opacity-80">Recent Treatments</h4>
                  {treatments.length === 0 && <p className="text-xs text-gray-400 italic">No treatments recorded.</p>}
                  
                  {treatments.map(t => (
                      <div key={t.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                                  <Droplets className="w-3.5 h-3.5" />
                                  <span>{t.treatment_type}</span>
                              </div>
                              <span className="text-xs text-blue-600">{new Date(t.treatment_date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">{t.product_name} - {t.quantity}</p>
                          {t.notes && <p className="text-[10px] text-blue-500 mt-1 italic">"{t.notes}"</p>}
                      </div>
                  ))}
              </div>

              <div className="pt-2 space-y-3">
                <button 
                  onClick={() => setIsTreatmentModalOpen(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Treatment
                </button>
                <button 
                  onClick={openUpdateYield}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors text-sm"
                >
                  <Scissors className="w-4 h-4" /> Update Yield
                </button>
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

      {/* MODAL: Add/Edit Crop */}
      {isCropModalOpen && (
        <Modal title={editingCrop ? "Edit Crop Details" : "Add New Crop"} onClose={() => setIsCropModalOpen(false)}>
            <form onSubmit={handleSaveCrop} className="space-y-4">
              <input name="plot_number" required defaultValue={editingCrop?.plot_number} type="text" placeholder="Plot Number (e.g. A001)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              <input name="crop_type" required defaultValue={editingCrop?.crop_type} type="text" placeholder="Crop Type (e.g. Maize)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              
              <div className="grid grid-cols-2 gap-4">
                <input name="variety" defaultValue={editingCrop?.variety} type="text" placeholder="Variety" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="plot_size_acres" required defaultValue={editingCrop?.plot_size_acres} type="number" step="0.1" placeholder="Size (acres)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <input name="location" defaultValue={editingCrop?.location} type="text" placeholder="Location" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                 <input name="estimated_yield_kg" defaultValue={editingCrop?.estimated_yield_kg} type="number" placeholder="Est. Yield (kg)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Planting Date</label>
                    <input name="planting_date" required defaultValue={editingCrop ? new Date(editingCrop.planting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-green-500" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Exp. Harvest</label>
                    <input name="expected_harvest_date" defaultValue={editingCrop?.expected_harvest_date ? new Date(editingCrop.expected_harvest_date).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-green-500" />
                </div>
              </div>
              
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold mt-4">
                {editingCrop ? "Update Crop" : "Save Crop"}
              </button>
            </form>
        </Modal>
      )}

      {/* MODAL: Update Yield */}
      {isYieldModalOpen && selectedCrop && (
        <Modal title="Update Yield" onClose={() => setIsYieldModalOpen(false)}>
            <form onSubmit={handleSaveYield} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-500">Estimated Yield</p>
                    <p className="text-xl font-bold text-gray-800">{selectedCrop.estimated_yield_kg} kg</p>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Actual Yield (kg)</label>
                    <input name="actual_yield" type="number" required defaultValue={selectedCrop.actual_yield_kg} placeholder="Enter actual yield" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                </div>

                <div className="space-y-1">
                    <textarea name="harvest_notes" rows={3} defaultValue={selectedCrop.harvest_notes} placeholder="Harvest notes (optional)" className="w-full border p-3 rounded-lg resize-none outline-none focus:border-green-500" />
                </div>

                <div className="flex gap-4 mt-4">
                    <button type="button" onClick={() => setIsYieldModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">Cancel</button>
                    <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-bold">Update Yield</button>
                </div>
            </form>
        </Modal>
      )}

      {/* MODAL: Add Treatment */}
      {isTreatmentModalOpen && (
        <Modal title="Add Treatment" onClose={() => setIsTreatmentModalOpen(false)}>
            <form onSubmit={handleSaveTreatment} className="space-y-4">
                <select name="treatment_type" className="w-full border p-3 rounded-lg bg-white outline-none focus:border-green-500">
                    <option>Fertilizer</option>
                    <option>Pesticide</option>
                    <option>Irrigation</option>
                    <option>Pruning</option>
                    <option>Other</option>
                </select>
                
                <input name="product_name" type="text" placeholder="Product Name (e.g. NPK 15-15-15)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Date</label>
                    <input name="treatment_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-green-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input name="quantity" type="text" placeholder="Quantity (e.g. 50kg)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                    <div className="relative">
                        <DollarSign className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                        <input name="cost" type="number" step="0.01" placeholder="Cost" className="w-full border pl-9 p-3 rounded-lg outline-none focus:border-green-500" />
                    </div>
                </div>

                <textarea name="notes" placeholder="Notes (optional)" rows={3} className="w-full border p-3 rounded-lg resize-none outline-none focus:border-green-500" />

                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold">
                    Save Treatment
                </button>
            </form>
        </Modal>
      )}

    </div>
  );
}

// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    growing: 'bg-yellow-100 text-yellow-700',
    planted: 'bg-green-100 text-green-700',
    harvested: 'bg-blue-100 text-blue-700'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[status?.toLowerCase()] || 'bg-gray-100'}`}>
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
    <div className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            {children}
          </div>
        </div>
    );
}
