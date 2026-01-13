'use client';

import { useState, useEffect } from 'react';
import { 
  Cat, HeartPulse, Syringe, Plus, X, Weight, 
  FileDown, Pencil, Trash2, CheckCircle, Wifi, WifiOff, RefreshCw 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/lib/logo';
import { addSvgToPdf } from '@/lib/pdfUtils';

// Database Imports
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dbLocal';
import { syncTable, fetchAndCache } from '@/lib/syncUtils';

export default function LivestockManagement() {
  // --- 1. LOCAL DATA (Reactive) ---
  const animals = useLiveQuery(() => db.livestock.toArray()) || [];
  const allLogs = useLiveQuery(() => db.logs.toArray()) || [];

  // Track ID instead of object for better stability
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedAnimal = animals.find(a => a.id === selectedId);

  // Filter history logs for the selected animal
  const vaccines = allLogs.filter(l => l.livestock_id === selectedId && l.type === 'vaccine');
  const treatments = allLogs.filter(l => l.livestock_id === selectedId && l.type === 'treatment');
  const weights = allLogs.filter(l => l.livestock_id === selectedId && l.type === 'weight');

  // UI States
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<any>(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- 2. SYNC & CONNECTIVITY ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', () => { handleStatus(); runSync(); });
        window.addEventListener('offline', handleStatus);

        runSync();
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }
  }, []);

  async function runSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncing(true);
    try {
        await syncTable('livestock', '/api/livestock');
        await syncTable('logs', '/api/livestock/history');
        await fetchAndCache('livestock', '/api/livestock');
        await fetchAndCache('logs', '/api/livestock/history');
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  }

  function showNotification(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }

  // --- 3. HANDLERS ---

  async function handleSaveAnimal(e: any) {
    e.preventDefault();
    const formData = {
      animal_id: e.target.animal_id.value,
      species: e.target.species.value,
      breed: e.target.breed.value,
      sex: e.target.sex.value,
      date_of_birth: e.target.dob.value,
      current_weight_kg: parseFloat(e.target.weight.value),
      health_status: editingAnimal ? e.target.status.value : 'Healthy',
      sync_status: editingAnimal ? 'pending_update' : 'pending_create'
    };

    try {
        if (editingAnimal) {
            await db.livestock.update(editingAnimal.id, formData);
            showNotification('Animal updated locally');
        } else {
            const newId = await db.livestock.add(formData as any);
            setSelectedId(newId); // Select the new animal
            showNotification('Animal added locally');
        }
        setModalType(null);
        runSync();
    } catch (err) {
        showNotification("Error saving animal");
    }
  }

  async function handleAddHistory(e: any, type: string) {
    e.preventDefault();
    if (!selectedId) return;

    const baseData = { 
        type, 
        livestock_id: selectedId, 
        created_at: new Date().toISOString(),
        sync_status: 'pending_create'
    };
    
    let specificData: any = {};
    if (type === 'vaccine') {
        specificData = { name: e.target.v_name.value, date: e.target.v_date.value, vet: e.target.v_vet.value, batch: e.target.v_batch.value };
    } else if (type === 'treatment') {
        specificData = { condition: e.target.t_condition.value, medication: e.target.t_medication.value, dosage: e.target.t_dosage.value, date: e.target.t_date.value, vet: e.target.t_vet.value, notes: e.target.t_notes.value };
    } else if (type === 'weight') {
        const val = parseFloat(e.target.w_weight.value);
        specificData = { weight: val, date: e.target.w_date.value, notes: e.target.w_notes.value };
        await db.livestock.update(selectedId, { current_weight_kg: val, sync_status: 'pending_update' });
    }

    await db.logs.add({ ...baseData, ...specificData } as any);
    setModalType(null);
    showNotification('Record added to health history');
    runSync();
  }

  async function handleDeleteAnimal(id: number) {
    if (!window.confirm("Are you sure you want to delete this animal?")) return;
    try {
        await db.livestock.delete(id);
        // Also clean up local logs
        await db.logs.where('livestock_id').equals(id).delete();
        setSelectedId(null);
        showNotification("Animal deleted locally");
        runSync();
    } catch (e) { showNotification("Delete failed"); }
  }

  async function generateHealthBooklet() {
    if (!selectedAnimal) return;
    const doc = new jsPDF();
    doc.setFillColor(34, 197, 94);
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
    doc.text(`ID: ${selectedAnimal.animal_id}`, 14, 50);
    doc.text(`Species: ${selectedAnimal.species}`, 14, 58);
    doc.text(`Breed: ${selectedAnimal.breed}`, 14, 66);
    doc.text(`Gender: ${selectedAnimal.sex}`, 100, 58);
    doc.text(`Status: ${selectedAnimal.health_status}`, 100, 66);
    
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text("Vaccination Record", 14, 85);
    autoTable(doc, {
      startY: 90,
      head: [['Date', 'Vaccine', 'Batch #', 'Vet']],
      body: vaccines.map((v: any) => [new Date(v.date).toLocaleDateString(), v.name, v.batch, v.vet]),
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.text("Treatment History", 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Condition', 'Medication', 'Dosage']],
      body: treatments.map((t: any) => [new Date(t.date).toLocaleDateString(), t.condition, t.medication, t.dosage]),
    });
    
    doc.save(`${selectedAnimal.animal_id}_Health_Booklet.pdf`);
    showNotification('Health Booklet downloaded!');
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen relative">
      {/* SUCCESS TOAST */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livestock Management</h1>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? 
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Wifi className="w-3 h-3"/> Online</span> : 
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3"/> Offline Mode</span>
            }
            {isSyncing && <span className="text-xs text-blue-500 flex items-center ml-2"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Syncing...</span>}
          </div>
        </div>
        <button onClick={() => { setEditingAnimal(null); setModalType('animal'); }} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Add Animal
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Animal List */}
        <div className="flex-1 w-full space-y-4">
          {animals.length === 0 && <p className="text-gray-400 text-center py-10">No animals found.</p>}
          {animals.map((animal: any) => (
            <div 
              key={animal.id}
              onClick={() => setSelectedId(animal.id)}
              className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md relative
                ${selectedId === animal.id ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{animal.animal_id} <span className="text-gray-300 mx-1">|</span> {animal.species}</h3>
                  <p className="text-sm text-gray-500">Breed: {animal.breed}</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={animal.health_status} />
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAnimal(animal.id); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 border-t border-gray-50 pt-3">
                <span>Gender: <span className='font-bold text-gray-800'>{animal.sex}</span></span>
                <span>Weight: <span className='font-bold text-gray-800'>{animal.current_weight_kg} kg</span></span>
                <span>Logs: <span className='font-bold text-gray-800'>{allLogs.filter(l => l.livestock_id === animal.id).length}</span></span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Details Panel */}
        {selectedAnimal ? (
          <div className="w-full md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-6 sticky top-4 self-start">
            <div className="mb-6 pb-4 border-b flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedAnimal.animal_id}</h2>
                  <p className="text-gray-500 text-sm">{selectedAnimal.breed}</p>
              </div>
              <button onClick={() => { setEditingAnimal(selectedAnimal); setModalType('animal'); }} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <DetailRow label="Gender" value={selectedAnimal.sex} capitalize />
                <DetailRow label="Birth Date" value={new Date(selectedAnimal.date_of_birth).toLocaleDateString()} />
                <DetailRow label="Weight" value={`${selectedAnimal.current_weight_kg} kg`} />
                <DetailRow label="Status" value={<StatusBadge status={selectedAnimal.health_status} />} />
              </div>

              {/* History Snippet */}
              <div>
                 <h4 className="font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-3">Health History</h4>
                 {vaccines.length === 0 && treatments.length === 0 && <p className="text-xs text-gray-400 italic">No health records yet.</p>}
                 {vaccines.slice(0, 3).map((v: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                        <span className="text-green-700 font-bold flex items-center gap-1"><Syringe className="w-3 h-3"/> {v.name}</span>
                        <span className="text-gray-400">{new Date(v.date).toLocaleDateString()}</span>
                    </div>
                 ))}
              </div>

              <div className="pt-4 grid grid-cols-2 gap-2">
                <ActionButton title="Vaccine" icon={Syringe} color="green" onClick={() => setModalType('vaccine')} />
                <ActionButton title="Treatment" icon={HeartPulse} color="yellow" onClick={() => setModalType('treatment')} />
                <ActionButton title="Weight" icon={Weight} color="blue" onClick={() => setModalType('weight')} />
                <ActionButton title="Booklet" icon={FileDown} color="orange" onClick={generateHealthBooklet} />
              </div>
            </div>
          </div>
        ) : (
            <div className="hidden md:flex w-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-10 flex-col items-center justify-center text-gray-400 h-64 sticky top-4">
                <Cat className="w-12 h-12 mb-2 opacity-10" />
                <p className="text-sm font-medium">Select an animal to view history</p>
            </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Add/Edit Animal Modal */}
      {modalType === 'animal' && (
        <Modal title={editingAnimal ? "Update Animal" : "Register Animal"} onClose={() => setModalType(null)}>
            <form onSubmit={handleSaveAnimal} className="space-y-4">
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Animal Tag / ID</label>
                  <input name="animal_id" required defaultValue={editingAnimal?.animal_id} placeholder="e.g. GT-001" className="w-full border p-3 rounded-lg outline-none focus:border-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Species</label>
                      <select name="species" defaultValue={editingAnimal?.species} className="w-full border p-3 rounded-lg bg-white outline-none">
                        <option>Goat</option><option>Cattle</option><option>Sheep</option><option>Pig</option><option>Poultry</option>
                      </select>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Breed</label>
                      <input name="breed" defaultValue={editingAnimal?.breed} placeholder="e.g. Boer" className="w-full border p-3 rounded-lg outline-none" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Gender (sex)</label>
                    <select name="sex" defaultValue={editingAnimal?.sex} className="w-full border p-3 rounded-lg bg-white outline-none">
                        <option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Weight (kg)</label>
                    <input name="weight" required defaultValue={editingAnimal?.current_weight_kg} type="number" step="0.1" className="w-full border p-3 rounded-lg outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Birth Date</label>
                <input name="dob" required defaultValue={editingAnimal ? new Date(editingAnimal.date_of_birth).toISOString().split('T')[0] : ''} type="date" className="w-full border p-3 rounded-lg text-gray-600 outline-none" />
              </div>
              {editingAnimal && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Health Status</label>
                    <select name="status" defaultValue={editingAnimal.health_status} className="w-full border p-3 rounded-lg bg-white outline-none">
                        <option value="Healthy">Healthy</option><option value="Sick">Sick / Injured</option><option value="Sold">Sold</option><option value="Deceased">Deceased</option>
                    </select>
                  </div>
              )}
              <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-green-100 transition-all hover:bg-green-700">Save Animal</button>
            </form>
        </Modal>
      )}

      {/* 2. Add Vaccination Modal */}
      {modalType === 'vaccine' && (
        <Modal title="Add Vaccination" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'vaccine')} className="space-y-4">
                <input name="v_name" required placeholder="Vaccine Name (e.g. PPR)" className="w-full border p-3 rounded-lg outline-none" />
                <div className="grid grid-cols-2 gap-2">
                    <input name="v_batch" placeholder="Batch #" className="w-full border p-3 rounded-lg outline-none" />
                    <input name="v_vet" placeholder="Vet Name" className="w-full border p-3 rounded-lg outline-none" />
                </div>
                <input name="v_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none" />
                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save Record</button>
            </form>
        </Modal>
      )}

      {/* 3. Add Treatment Modal */}
      {modalType === 'treatment' && (
        <Modal title="Add Treatment" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'treatment')} className="space-y-4">
                <input name="t_condition" required placeholder="Condition / Illness" className="w-full border p-3 rounded-lg outline-none" />
                <input name="t_medication" required placeholder="Medication Used" className="w-full border p-3 rounded-lg outline-none" />
                <div className="grid grid-cols-2 gap-2">
                    <input name="t_dosage" placeholder="Dosage (e.g. 5ml)" className="w-full border p-3 rounded-lg outline-none" />
                    <input name="t_vet" placeholder="Vet Name" className="w-full border p-3 rounded-lg outline-none" />
                </div>
                <input name="t_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none" />
                <textarea name="t_notes" rows={2} placeholder="Notes..." className="w-full border p-3 rounded-lg resize-none outline-none" />
                <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold">Save Treatment</button>
            </form>
        </Modal>
      )}

      {/* 4. Update Weight Modal */}
      {modalType === 'weight' && (
        <Modal title="Weight Update" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'weight')} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Previous Weight</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedAnimal?.current_weight_kg} kg</p>
                </div>
                <input name="w_weight" required type="number" step="0.1" placeholder="New Weight (kg)" className="w-full border p-3 rounded-lg outline-none focus:border-blue-500" />
                <input name="w_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-lg outline-none" />
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Update Weight</button>
            </form>
        </Modal>
      )}
    </div>
  );
}

// --- Helpers ---

function StatusBadge({ status }: { status: string }) {
  const styles: any = { healthy: 'bg-green-100 text-green-700', sick: 'bg-red-100 text-red-700', sold: 'bg-blue-100 text-blue-700', deceased: 'bg-black text-white' };
  return <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${styles[status?.toLowerCase()] || 'bg-gray-100'}`}>{status}</span>;
}

function DetailRow({ label, value, capitalize }: any) {
  return (
    <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 font-medium">{label}</span>
      <div className={`font-bold text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</div>
    </div>
  );
}

function ActionButton({ title, icon: Icon, color, onClick }: any) {
    const colors: any = { green: 'bg-green-600', yellow: 'bg-yellow-500', blue: 'bg-blue-600', orange: 'bg-orange-500' };
    return (
        <button onClick={onClick} className={`w-full ${colors[color]} text-white py-3 rounded-xl font-bold text-[10px] flex flex-col justify-center items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-md`}>
            <Icon className="w-4 h-4" /> {title}
        </button>
    );
}

function Modal({ title, onClose, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-black text-gray-900">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="text-gray-400 w-5 h-5" /></button>
            </div>
            {children}
          </div>
        </div>
    );
}
