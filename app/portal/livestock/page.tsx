'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  renderHeader, 
  renderFooters, 
  renderSectionTitle,
  renderDetailRow,
  TABLE_HEAD_STYLES, 
  TABLE_STYLES, 
  TABLE_ALT_ROW_STYLES,
  getFarmLogo,
  fetchBase64Image
} from '@/lib/pdfTemplate';

import { AnimalList } from '@/components/livestock/AnimalList';
import { AnimalDetail } from '@/components/livestock/AnimalDetail';
import { LivestockModals } from '@/components/livestock/LivestockModals';

// SAFE UUID GENERATOR (Works on mobile/http)
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

export default function LivestockManagement() {
  const animals = useLiveQuery(() => 
    db.livestock.filter(a => a.syncStatus !== 'deleted').toArray().then(rows => rows.reverse())
  ) || [];
  
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  
  const history = useLiveQuery(
    () => selectedAnimal ? db.livestock_logs.where('livestock_id').equals(selectedAnimal.id).reverse().sortBy('date') : [],
    [selectedAnimal?.id]
  ) || [];

  const vaccines = history.filter(h => h.type === 'vaccine').map(h => ({ ...h.data, id: h.id, date: h.date }));
  const treatments = history.filter(h => h.type === 'treatment').map(h => ({ ...h.data, id: h.id, date: h.date }));

  const [modalType, setModalType] = useState<string | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

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
        await db.livestock.add({ 
            id: generateUUID(), 
            ...formData, 
            createdAt: new Date().toISOString(),
            syncStatus: 'pending' 
        } as any);
        toast.success("New animal added");
      }
      setModalType(null);
      setEditingAnimal(null);
    } catch {
      toast.error("Failed to save");
    }
  }
  
  async function handleDelete() {
    if (!confirmDelete) return;

    try {
        const animal = await db.livestock.get(confirmDelete.id);
        if (animal && animal.syncStatus === 'pending') {
            await db.livestock.delete(confirmDelete.id);
        } else {
            await db.livestock.update(confirmDelete.id, { syncStatus: 'deleted', updatedAt: new Date().toISOString() });
        }
        
        toast.success(`Animal ${confirmDelete.animal_id} deleted.`);
        if (selectedAnimal?.id === confirmDelete.id) {
            setSelectedAnimal(null);
        }
    } catch {
        toast.error("Failed to delete animal.");
    } finally {
        setConfirmDelete(null);
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
        specificData = { vaccine_name: e.target.v_name.value, veterinarian: e.target.v_vet.value, batch_number: e.target.v_batch.value };
    } else if (type === 'treatment') {
        specificData = { condition: e.target.t_condition.value, medication: e.target.t_medication.value, dosage: e.target.t_dosage.value, veterinarian: e.target.t_vet.value, notes: e.target.t_notes.value };
    } else if (type === 'weight') {
        const newWeight = Number(e.target.w_weight.value);
        specificData = { weight: newWeight, notes: e.target.w_notes.value };
        await db.livestock.update(selectedAnimal.id, { 
            current_weight_kg: newWeight,
            syncStatus: 'updated',
            updatedAt: new Date().toISOString()
        });
        setSelectedAnimal({ ...selectedAnimal, current_weight_kg: newWeight });
    }
    try {
        await db.livestock_logs.add({
            id: generateUUID(),
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
    } catch {
        toast.error("Failed to save record");
    }
  }

  async function generateHealthBooklet() {
    if (!selectedAnimal) return;
    const doc = new jsPDF();
    
    const userLogo = getFarmLogo();
    const logoToUse = userLogo || await fetchBase64Image('/logo.png');

    // Fetch live farm settings
    let farmName = 'FieldOps Farm';
    let settingsData: any = {};
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            settingsData = await res.json();
            if (settingsData.farm_name) farmName = settingsData.farm_name;
        }
    } catch {}

    let y = renderHeader({
      doc,
      title: "ANIMAL HEALTH BOOKLET",
      subtitle: `Generated: ${new Date().toLocaleDateString()}`,
      logoData: logoToUse,
      farmName: farmName,
      settingsData: settingsData
    });

    y = renderSectionTitle(doc, "ANIMAL PROFILE", y + 10);
    
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'FD');
    
    renderDetailRow(doc, "ID:", selectedAnimal.animal_id || 'N/A', 20, y + 8);
    renderDetailRow(doc, "Species:", selectedAnimal.species || 'N/A', 20, y + 16);
    renderDetailRow(doc, "Breed:", selectedAnimal.breed || 'N/A', 80, y + 8);
    renderDetailRow(doc, "Gender:", selectedAnimal.sex || 'N/A', 80, y + 16);
    renderDetailRow(doc, "Status:", selectedAnimal.health_status || 'N/A', 140, y + 8);
    renderDetailRow(doc, "Weight:", selectedAnimal.current_weight_kg ? `${selectedAnimal.current_weight_kg} kg` : 'N/A', 140, y + 16);
    
    y += 35;

    y = renderSectionTitle(doc, "VACCINATION RECORD", y);
    autoTable(doc, { 
      startY: y + 5, 
      head: [['Date', 'Vaccine Name', 'Batch #', 'Veterinarian']], 
      body: vaccines.map(v => [new Date(v.date).toLocaleDateString(), v.vaccine_name, v.batch_number, v.veterinarian]),
      theme: 'grid',
      headStyles: TABLE_HEAD_STYLES,
      styles: TABLE_STYLES,
      alternateRowStyles: TABLE_ALT_ROW_STYLES
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    y = renderSectionTitle(doc, "TREATMENT HISTORY", y);
    autoTable(doc, { 
      startY: y + 5, 
      head: [['Date', 'Condition', 'Medication', 'Dosage', 'Vet']], 
      body: treatments.map(t => [new Date(t.date).toLocaleDateString(), t.condition, t.medication, t.dosage, t.veterinarian]),
      theme: 'grid',
      headStyles: TABLE_HEAD_STYLES,
      styles: TABLE_STYLES,
      alternateRowStyles: TABLE_ALT_ROW_STYLES
    });

    renderFooters({ doc });
    doc.save(`${selectedAnimal.animal_id}_Health_Booklet.pdf`);
    toast.success('Health Booklet downloaded!');
  }

  const filteredAnimals = animals.filter(a => 
    a.animal_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.breed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen relative pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Livestock Management</h1>
          <p className="text-muted-foreground">Monitor your animals&apos; health and growth</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search ID or Breed..." 
                    className="w-full pl-9 pr-4 py-2 border border-border bg-background text-foreground rounded-lg text-sm outline-none focus:border-primary"
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
            <button 
                onClick={() => { setEditingAnimal(null); setModalType('animal'); }}
                className="bg-primary hover:brightness-110 text-primary-foreground text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-all whitespace-nowrap active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Add Animal
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <AnimalList 
            filteredAnimals={filteredAnimals}
            selectedAnimal={selectedAnimal}
            onSelectAnimal={setSelectedAnimal}
        />
        
        <AnimalDetail 
            selectedAnimal={selectedAnimal}
            vaccines={vaccines}
            onEdit={() => { setEditingAnimal(selectedAnimal); setModalType('animal'); }}
            onDelete={() => setConfirmDelete(selectedAnimal)}
            onVaccinate={() => setModalType('vaccine')}
            onTreat={() => setModalType('treatment')}
            onWeigh={() => setModalType('weight')}
            onDownloadPDF={generateHealthBooklet}
        />
      </div>

      <LivestockModals 
          modalType={modalType}
          setModalType={setModalType}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          editingAnimal={editingAnimal}
          selectedAnimal={selectedAnimal}
          handleSaveAnimal={handleSaveAnimal}
          handleDelete={handleDelete}
          handleAddHistory={handleAddHistory}
      />
    </div>
  );
}
