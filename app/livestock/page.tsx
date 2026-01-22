'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { 
  Cat, HeartPulse, Syringe, Plus, X, Weight, 
  FileDown, Pencil, CheckCircle, Search, Filter 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils';

export default function LivestockManagement() {
  // 1. REAL-TIME DATA
  const animals = useLiveQuery(() => db.livestock.toArray().then(rows => rows.reverse())) || [];
  
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);

  // 2. REAL-TIME HISTORY (Filtered by selected animal)
  const history = useLiveQuery(
    () => selectedAnimal ? db.livestock_logs.where('livestock_id').equals(selectedAnimal.id).reverse().sortBy('date') : [],
    [selectedAnimal?.id]
  ) || [];

  // Derived History Lists
  const vaccines = history.filter(h => h.type === 'vaccine').map(h => ({ ...h.data, id: h.id, date: h.date }));
  const treatments = history.filter(h => h.type === 'treatment').map(h => ({ ...h.data, id: h.id, date: h.date }));
  // Weights are stored in logs, but current weight is on the animal object

  // Modals & State
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- ACTIONS ---

  async function handleSaveAnimal(e: any) {
    e.preventDefault();
    const formData = {
      animal_id: e.target.animal_id.value,
      species: e.target.species.value,
      breed: e.target.breed.value,
      sex: e.target.sex.value,
      date_of_birth: e.target.dob.value,
      current_weight_kg: Number(e.target.weight.value),
      health_status: editingAnimal ? e.target.status.value : 'Healthy',
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingAnimal) {
        await db.livestock.update(editingAnimal.id, { ...formData, syncStatus: 'updated' });
        toast.success("Animal updated");
        if (selectedAnimal?.id === editingAnimal.id) {
             setSelectedAnimal({ ...selectedAnimal, ...formData });
        }
      } else {
        // GENERATE UUID HERE
        await db.livestock.add({ 
            id: crypto.randomUUID(), 
            ...formData, 
            createdAt: new Date().toISOString(),
            syncStatus: 'pending' 
        } as any);
        toast.success("New animal added");
      }
      setModalType(null);
      setEditingAnimal(null);
    } catch (err) {
      toast.error("Failed to save");
    }
  }

  async function handleAddHistory(e: any, type: string) {
    e.preventDefault();
    if (!selectedAnimal) return;

    let specificData = {};
    const date = type === 'vaccine' ? e.target.v_date.value 
               : type === 'treatment' ? e.target.t_date.value 
               : e.target.w_date.value;

    if (type === 'vaccine') {
        specificData = {
            vaccine_name: e.target.v_name.value,
            veterinarian: e.target.v_vet.value,
            batch_number: e.target.v_batch.value
        };
    } else if (type === 'treatment') {
        specificData = {
            condition: e.target.t_condition.value,
            medication: e.target.t_medication.value,
            dosage: e.target.t_dosage.value,
            veterinarian: e.target.t_vet.value,
            notes: e.target.t_notes.value
        };
    } else if (type === 'weight') {
        const newWeight = Number(e.target.w_weight.value);
        specificData = {
            weight: newWeight,
            notes: e.target.w_notes.value
        };
        // Update main animal weight too
        await db.livestock.update(selectedAnimal.id, { 
            current_weight_kg: newWeight,
            syncStatus: 'updated',
            updatedAt: new Date().toISOString()
        });
        setSelectedAnimal({ ...selectedAnimal, current_weight_kg: newWeight });
    }

    try {
        // GENERATE UUID HERE
        await db.livestock_logs.add({
            id: crypto.randomUUID(),
            livestock_id: selectedAnimal.id,
            type: type as any,
            date: date,
            data: specificData,
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as any);
        
        toast.success("Record saved");
        setModalType(null);
    } catch (err) {
        toast.error("Failed to save record");
    }
  }

  // --- PDF GENERATOR ---
  async function generateHealthBooklet() {
    if (!selectedAnimal) return;
    const doc = new jsPDF();
    
    // Teal Header
    doc.setFillColor(20, 184, 166); // Primary-500
    doc.rect(0, 0, 210, 45, 'F'); 
    
    if (logoBase64) {
      const svgString = atob(logoBase64.split(',')[1]);
      await addSvgToPdf(doc, svgString, 15, 7, 30, 30);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("ANIMAL HEALTH BOOKLET", 105, 28, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`ID: ${selectedAnimal.animal_id}`, 14, 55);
    doc.text(`Species: ${selectedAnimal.species}`, 14, 63);
    doc.text(`Breed: ${selectedAnimal.breed}`, 14, 71);
    doc.text(`Gender: ${selectedAnimal.sex}`, 100, 55);
    doc.text(`Status: ${selectedAnimal.health_status}`, 100, 63);

    doc.setFontSize(14);
    doc.setTextColor(20, 184, 166);
    doc.text("Vaccination Record", 14, 90);
    
    autoTable(doc, {
      startY: 95,
      head: [['Date', 'Vaccine Name', 'Batch #', 'Veterinarian']],
      body: vaccines.map(v => [new Date(v.date).toLocaleDateString(), v.vaccine_name, v.batch_number, v.veterinarian]),
      headStyles: { fillColor: [20, 184, 166] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.text("Treatment History", 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Condition', 'Medication', 'Dosage', 'Vet']],
      body: treatments.map(t => [new Date(t.date).toLocaleDateString(), t.condition, t.medication, t.dosage, t.veterinarian]),
      headStyles: { fillColor: [234, 179, 8] } // Yellow/Orange for treatments
    });

    doc.save(`${selectedAnimal.animal_id}_Health_Booklet.pdf`);
    toast.success('Health Booklet downloaded!');
  }

  // Search Filter
  const filteredAnimals = animals.filter(a => 
    a.animal_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.breed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen relative pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livestock Management</h1>
          <p className="text-gray-500">Monitor your animals' health and growth</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search ID or Breed..." 
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-primary-500"
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
            <button 
                onClick={() => { setEditingAnimal(null); setModalType('animal'); }}
                className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-colors whitespace-nowrap"
            >
                <Plus className="w-4 h-4" />
                Add Animal
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Animal List */}
        <div className="flex-1 w-full grid grid-cols-1 gap-4">
          {animals && animals.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                  <Cat className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No animals added yet.</p>
              </div>
          )}
          {filteredAnimals.map((animal: any) => (
            <div 
              key={animal.id}
              onClick={() => setSelectedAnimal(animal)}
              className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md 
                ${selectedAnimal?.id === animal.id ? 'border-primary-500 ring-1 ring-primary-500 shadow-md' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {animal.animal_id} <span className="text-gray-300 font-normal">|</span> {animal.species}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Breed: {animal.breed}</p>
                </div>
                <StatusBadge status={animal.health_status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3">
                <span>Gender: <span className='font-medium text-gray-800'>{animal.sex}</span></span>
                <span>Weight: <span className='font-medium text-gray-800'>{animal.current_weight_kg} kg</span></span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Details Panel */}
        {selectedAnimal ? (
          <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4 animate-in slide-in-from-right-4 duration-300">
            <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedAnimal.animal_id}</h2>
                  <p className="text-gray-500 font-medium">{selectedAnimal.breed}</p>
              </div>
              <button 
                onClick={() => { setEditingAnimal(selectedAnimal); setModalType('animal'); }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-primary-600 transition-colors"
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
                 {vaccines.slice(0, 3).map((v: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-primary-700 font-medium">{v.vaccine_name}</span>
                        <span className="text-gray-400 text-xs">{new Date(v.date).toLocaleDateString()}</span>
                    </div>
                 ))}
                 {vaccines.length === 0 && <p className="text-xs text-gray-400 italic">No records.</p>}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 grid grid-cols-2 gap-3">
                <ActionButton title="Vaccination" icon={Syringe} color="primary" onClick={() => setModalType('vaccine')} />
                <ActionButton title="Treatment" icon={HeartPulse} color="yellow" onClick={() => setModalType('treatment')} />
                <ActionButton title="Weigh In" icon={Weight} color="blue" onClick={() => setModalType('weight')} />
                <ActionButton title="Health PDF" icon={FileDown} color="dark" onClick={generateHealthBooklet} />
              </div>
            </div>
          </div>
        ) : (
            <div className="hidden lg:flex w-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-10 flex-col items-center justify-center text-gray-400 h-64 sticky top-4">
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
              <input name="animal_id" required defaultValue={editingAnimal?.animal_id} type="text" placeholder="Animal ID (e.g. COW001)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
              <select name="species" defaultValue={editingAnimal?.species} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-primary-500">
                <option>Cattle</option>
                <option>Goat</option>
                <option>Pig</option>
                <option>Sheep</option>
                <option>Poultry</option>
              </select>
              <input name="breed" defaultValue={editingAnimal?.breed} type="text" placeholder="Breed" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
              
              <div className="grid grid-cols-2 gap-4">
                <select name="sex" defaultValue={editingAnimal?.sex} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-primary-500">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <input name="weight" required defaultValue={editingAnimal?.current_weight_kg} type="number" step="0.1" placeholder="Weight (kg)" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Date of Birth</label>
                <input name="dob" required defaultValue={editingAnimal ? new Date(editingAnimal.date_of_birth).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none focus:border-primary-500" />
              </div>

              {/* Status (Only show when editing) */}
              {editingAnimal && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Health Status</label>
                    <select name="status" defaultValue={editingAnimal.health_status} className="w-full border p-3 rounded-lg bg-white outline-none focus:border-primary-500">
                        <option value="Healthy">Healthy</option>
                        <option value="Sick">Sick / Injured</option>
                        <option value="Sold">Sold</option>
                        <option value="Deceased">Deceased</option>
                    </select>
                  </div>
              )}
              
              <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold mt-4">
                {editingAnimal ? "Update Animal" : "Save Animal"}
              </button>
            </form>
        </Modal>
      )}

      {/* 2. Add Vaccination Modal */}
      {modalType === 'vaccine' && (
        <Modal title="Add Vaccination Record" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'vaccine')} className="space-y-4">
                <input name="v_name" required type="text" placeholder="Vaccine Name" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <input name="v_batch" type="text" placeholder="Batch Number" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <input name="v_vet" type="text" placeholder="Veterinarian Name" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <input name="v_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold">Save Record</button>
            </form>
        </Modal>
      )}

      {/* 3. Add Treatment Modal */}
      {modalType === 'treatment' && (
        <Modal title="Add Treatment Record" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'treatment')} className="space-y-4">
                <input name="t_condition" required type="text" placeholder="Condition / Illness" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <input name="t_medication" required type="text" placeholder="Medication Used" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <div className="grid grid-cols-2 gap-4">
                    <input name="t_dosage" type="text" placeholder="Dosage" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                    <input name="t_vet" type="text" placeholder="Vet Name" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                </div>
                <input name="t_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                <textarea name="t_notes" rows={2} placeholder="Notes..." className="w-full border p-3 rounded-lg resize-none outline-none focus:border-primary-500" />
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
    const colors: any = {
        primary: 'bg-primary-600 hover:bg-primary-700',
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        blue: 'bg-blue-600 hover:bg-blue-700',
        dark: 'bg-gray-800 hover:bg-gray-900'
    }
    return (
        <button onClick={onClick} className={`w-full ${colors[color]} text-white py-2.5 rounded-lg font-medium text-[11px] md:text-sm flex flex-col md:flex-row justify-center items-center gap-2 transition-colors shadow-sm`}>
            <Icon className="w-4 h-4" />
            {title}
        </button>
    )
}

function Modal({ title, onClose, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            {children}
          </div>
        </div>
    );
}
