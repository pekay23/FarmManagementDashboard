'use client';

import { useState, useEffect } from 'react';
import { Cat, HeartPulse, Syringe, Plus, X, Weight, FileDown, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LivestockManagement() {
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  
  // History Data State
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);

  // Modals
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<any>(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchAnimals();
  }, []);

  useEffect(() => {
    if (selectedAnimal) {
      fetchHistory(selectedAnimal.id);
    }
  }, [selectedAnimal]);

  async function fetchAnimals() {
  try {
    const res = await fetch('/api/livestock');
    const data = await res.json();
    if (Array.isArray(data)) {
      setAnimals(data);
    } else {
      console.error("API returned non-array:", data);
      setAnimals([]); // Fallback to empty array
    }
  } catch (error) {
    console.error("Failed to fetch animals:", error);
    setAnimals([]);
  }
}
  async function fetchHistory(id: string) {
    const [vRes, tRes, wRes] = await Promise.all([
      fetch(`/api/livestock/history?type=vaccines&id=${id}`),
      fetch(`/api/livestock/history?type=treatments&id=${id}`),
      fetch(`/api/livestock/history?type=weights&id=${id}`)
    ]);
    setVaccines(await vRes.json());
    setTreatments(await tRes.json());
    setWeights(await wRes.json());
  }

  // --- PDF GENERATOR ---
  function generateHealthBooklet() {
    if (!selectedAnimal) return;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("ANIMAL HEALTH BOOKLET", 105, 25, { align: "center" });
    
    // Animal Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`ID: ${selectedAnimal.animal_id}`, 14, 50);
    doc.text(`Species: ${selectedAnimal.species}`, 14, 58);
    doc.text(`Breed: ${selectedAnimal.breed}`, 14, 66);
    doc.text(`Gender: ${selectedAnimal.sex}`, 100, 58);
    doc.text(`Status: ${selectedAnimal.health_status}`, 100, 66);

    // Vaccines Table
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text("Vaccination Record", 14, 85);
    autoTable(doc, {
      startY: 90,
      head: [['Date', 'Vaccine Name', 'Batch #', 'Veterinarian']],
      body: vaccines.map(v => [new Date(v.vaccination_date).toLocaleDateString(), v.vaccine_name, v.batch_number, v.veterinarian]),
    });

    // Treatments Table
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.text("Treatment History", 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Condition', 'Medication', 'Dosage', 'Vet']],
      body: treatments.map(t => [new Date(t.treatment_date).toLocaleDateString(), t.condition, t.medication, t.dosage, t.veterinarian]),
    });

    doc.save(`${selectedAnimal.animal_id}_Health_Booklet.pdf`);
  }

  // --- HANDLERS ---
  async function handleSaveAnimal(e: any) {
    e.preventDefault();
    const formData = {
      animal_id: e.target.animal_id.value,
      species: e.target.species.value,
      breed: e.target.breed.value,
      sex: e.target.sex.value,
      date_of_birth: e.target.dob.value,
      current_weight_kg: e.target.weight.value,
      health_status: editingAnimal ? e.target.status.value : 'Healthy'
    };

    const method = editingAnimal ? 'PUT' : 'POST';
    const body = editingAnimal ? { ...formData, id: editingAnimal.id } : formData;

    await fetch('/api/livestock', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    fetchAnimals();
    setModalType(null);
    if (editingAnimal && selectedAnimal && editingAnimal.id === selectedAnimal.id) {
        setSelectedAnimal({ ...selectedAnimal, ...formData });
    }
  }

  async function handleAddHistory(e: any, type: string) {
    e.preventDefault();
    if (!selectedAnimal) return;

    const baseData = { type, livestock_id: selectedAnimal.id };
    let specificData = {};

    if (type === 'vaccine') {
        specificData = {
            name: e.target.v_name.value,
            date: e.target.v_date.value,
            vet: e.target.v_vet.value,
            batch: e.target.v_batch.value
        };
    } else if (type === 'treatment') {
        specificData = {
            condition: e.target.t_condition.value,
            medication: e.target.t_medication.value,
            dosage: e.target.t_dosage.value,
            date: e.target.t_date.value,
            vet: e.target.t_vet.value,
            notes: e.target.t_notes.value
        };
    } else if (type === 'weight') {
        specificData = {
            weight: e.target.w_weight.value,
            date: e.target.w_date.value,
            notes: e.target.w_notes.value
        };
    }

    await fetch('/api/livestock/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseData, ...specificData })
    });

    fetchHistory(selectedAnimal.id);
    if (type === 'weight') fetchAnimals(); // Refresh main list for new weight
    setModalType(null);
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livestock Management</h1>
          <p className="text-gray-500">Monitor your animals' health and growth</p>
        </div>
        <button 
          onClick={() => { setEditingAnimal(null); setModalType('animal'); }}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Animal
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Animal List */}
        <div className="flex-1 w-full space-y-4">
          {animals.length === 0 && <p className="text-gray-400 text-center py-10">No animals added yet.</p>}
          {animals.map((animal) => (
            <div 
              key={animal.id}
              onClick={() => setSelectedAnimal(animal)}
              className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md 
                ${selectedAnimal?.id === animal.id ? 'border-green-500 ring-1 ring-green-500 shadow-md' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {animal.animal_id} <span className="text-gray-400 font-normal">|</span> {animal.species}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Breed: {animal.breed}</p>
                </div>
                <StatusBadge status={animal.health_status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3">
                <span>Gender: <span className='font-medium text-gray-800'>{animal.sex}</span></span>
                <span>Weight: <span className='font-medium text-gray-800'>{animal.current_weight_kg} kg</span></span>
                <span>Vaccinations: <span className='font-medium text-gray-800'>{vaccines.filter(v => v.livestock_id === animal.id).length || '-'}</span></span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Details Panel */}
        {selectedAnimal ? (
          <div className="w-full md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-0 animate-in slide-in-from-right-4 duration-300 self-start">
            <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedAnimal.animal_id}</h2>
                  <p className="text-gray-500 font-medium">{selectedAnimal.breed}</p>
              </div>
              <button 
                onClick={() => { setEditingAnimal(selectedAnimal); setModalType('animal'); }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600"
              >
                  <Pencil className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <DetailRow label="Gender" value={selectedAnimal.sex} capitalize />
                <DetailRow label="Birth Date" value={new Date(selectedAnimal.date_of_birth).toLocaleDateString()} />
                <DetailRow label="Current Weight" value={`${selectedAnimal.current_weight_kg} kg`} />
                <DetailRow label="Health Status" value={<StatusBadge status={selectedAnimal.health_status} />} />
              </div>

              {/* History Lists */}
              <div>
                 <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wide opacity-70 mb-2">Recent Vaccinations</h4>
                 {vaccines.slice(0, 2).map((v, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                        <span className="text-green-700 font-medium">{v.vaccine_name}</span>
                        <span className="text-gray-400 text-xs">{new Date(v.vaccination_date).toLocaleDateString()}</span>
                    </div>
                 ))}
                 {vaccines.length === 0 && <p className="text-xs text-gray-400 italic">No records.</p>}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 grid grid-cols-2 gap-3">
                <ActionButton title="Add Vaccination" icon={Syringe} color="green" onClick={() => setModalType('vaccine')} />
                <ActionButton title="Add Treatment" icon={HeartPulse} color="yellow" onClick={() => setModalType('treatment')} />
                <ActionButton title="Update Weight" icon={Weight} color="blue" onClick={() => setModalType('weight')} />
                <ActionButton title="Health Booklet" icon={FileDown} color="orange" onClick={generateHealthBooklet} />
              </div>
            </div>
          </div>
        ) : (
            <div className="hidden md:flex w-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-10 flex-col items-center justify-center text-gray-400 h-64 sticky top-0">
                <Cat className="w-12 h-12 mb-2 opacity-20" />
                <p>Select an animal to view details</p>
            </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Add/Edit Animal Modal */}
      {modalType === 'animal' && (
        <Modal title={editingAnimal ? "Edit Animal Details" : "Add New Animal"} onClose={() => setModalType(null)}>
            <form onSubmit={handleSaveAnimal} className="space-y-4">
              <input name="animal_id" required defaultValue={editingAnimal?.animal_id} type="text" placeholder="Animal ID (e.g. COW001)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              <select name="species" defaultValue={editingAnimal?.species} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-green-500">
                <option>Cattle</option>
                <option>Goat</option>
                <option>Pig</option>
                <option>Sheep</option>
                <option>Poultry</option>
              </select>
              <input name="breed" defaultValue={editingAnimal?.breed} type="text" placeholder="Breed" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              
              <div className="grid grid-cols-2 gap-4">
                <select name="sex" defaultValue={editingAnimal?.sex} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-green-500">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <input name="weight" required defaultValue={editingAnimal?.current_weight_kg} type="number" step="0.1" placeholder="Weight (kg)" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Date of Birth</label>
                <input name="dob" required defaultValue={editingAnimal ? new Date(editingAnimal.date_of_birth).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-green-500" />
              </div>

              {/* Status (Only show when editing) */}
              {editingAnimal && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Health Status</label>
                    <select name="status" defaultValue={editingAnimal.health_status} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-green-500">
                        <option value="Healthy">Healthy</option>
                        <option value="Sick">Sick / Injured</option>
                        <option value="Sold">Sold</option>
                        <option value="Deceased">Deceased</option>
                    </select>
                  </div>
              )}
              
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold mt-4">
                {editingAnimal ? "Update Animal" : "Save Animal"}
              </button>
            </form>
        </Modal>
      )}

      {/* 2. Add Vaccination Modal */}
      {modalType === 'vaccine' && (
        <Modal title="Add Vaccination Record" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'vaccine')} className="space-y-4">
                <input name="v_name" required type="text" placeholder="Vaccine Name" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="v_batch" type="text" placeholder="Batch Number" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="v_vet" type="text" placeholder="Veterinarian Name" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="v_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Record</button>
            </form>
        </Modal>
      )}

      {/* 3. Add Treatment Modal */}
      {modalType === 'treatment' && (
        <Modal title="Add Treatment Record" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'treatment')} className="space-y-4">
                <input name="t_condition" required type="text" placeholder="Condition / Illness" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <input name="t_medication" required type="text" placeholder="Medication Used" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <div className="grid grid-cols-2 gap-4">
                    <input name="t_dosage" type="text" placeholder="Dosage" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                    <input name="t_vet" type="text" placeholder="Vet Name" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                </div>
                <input name="t_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
                <textarea name="t_notes" rows={2} placeholder="Notes..." className="w-full border p-3 rounded-lg resize-none outline-none focus:border-green-500" />
                <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-bold">Save Treatment</button>
            </form>
        </Modal>
      )}

      {/* 4. Update Weight Modal */}
      {modalType === 'weight' && (
        <Modal title="Update Weight" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'weight')} className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center mb-4">
                    <p className="text-sm text-blue-600">Current Weight</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedAnimal?.current_weight_kg} kg</p>
                </div>
                <input name="w_weight" required type="number" step="0.1" placeholder="New Weight (kg)" className="w-full border p-3 rounded-lg outline-none focus:border-blue-500" />
                <input name="w_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none focus:border-blue-500" />
                <textarea name="w_notes" rows={2} placeholder="Notes (e.g. Monthly weigh-in)" className="w-full border p-3 rounded-lg resize-none outline-none focus:border-blue-500" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">Update Weight</button>
            </form>
        </Modal>
      )}

    </div>
  );
}

// --- Helpers ---
function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    healthy: 'bg-green-100 text-green-700',
    sick: 'bg-red-100 text-red-700',
    sold: 'bg-gray-100 text-gray-500',
    deceased: 'bg-black text-white'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[status?.toLowerCase()] || 'bg-gray-100'}`}>
      {status}
    </span>
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

function ActionButton({ title, icon: Icon, color, onClick }: any) {
    const colors = {
        green: 'bg-green-600 hover:bg-green-700',
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        blue: 'bg-blue-600 hover:bg-blue-700',
        orange: 'bg-orange-500 hover:bg-orange-600'
    }
    return (
        <button onClick={onClick} className={`w-full ${colors[color as 'green'|'yellow'|'blue'|'orange']} text-white py-2.5 rounded-lg font-medium text-[11px] md:text-sm flex flex-col md:flex-row justify-center items-center gap-2 transition-colors`}>
            <Icon className="w-4 h-4" />
            {title}
        </button>
    )
}

function Modal({ title, onClose, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            {children}
          </div>
        </div>
    );
}
