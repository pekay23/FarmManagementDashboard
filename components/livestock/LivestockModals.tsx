'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface LivestockModalsProps {
  modalType: string | null;
  setModalType: (type: string | null) => void;
  confirmDelete: any;
  setConfirmDelete: (animal: any) => void;
  editingAnimal: any;
  selectedAnimal: any;
  handleSaveAnimal: (e: any) => void;
  handleDelete: () => void;
  handleAddHistory: (e: any, type: string) => void;
}

export function LivestockModals({
  modalType,
  setModalType,
  confirmDelete,
  setConfirmDelete,
  editingAnimal,
  selectedAnimal,
  handleSaveAnimal,
  handleDelete,
  handleAddHistory
}: LivestockModalsProps) {
  return (
    <>
      {/* DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl text-center animate-in zoom-in-95">
                 <div className="bg-destructive/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                     <AlertTriangle className="w-8 h-8 text-destructive"/>
                 </div>
                 <h3 className="text-lg font-bold mb-2">Delete Animal?</h3>
                 <p className="text-muted-foreground text-sm mb-6">Are you sure you want to delete <strong>{confirmDelete.animal_id}</strong>? This action cannot be undone.</p>
                 <div className="flex gap-3">
                     <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
                     <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
                 </div>
             </div>
         </div>
      )}

      {/* 1. Add/Edit Animal Modal */}
      {modalType === 'animal' && (
        <Modal title={editingAnimal ? "Edit Animal Details" : "Add New Animal"} onClose={() => setModalType(null)}>
            <form onSubmit={handleSaveAnimal} className="space-y-4">
              <input name="animal_id" required defaultValue={editingAnimal?.animal_id} type="text" placeholder="Animal ID (e.g. COW001)" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <select name="species" defaultValue={editingAnimal?.species} className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option>Cattle</option><option>Goat</option><option>Pig</option><option>Sheep</option><option>Poultry</option>
              </select>
              <input name="breed" defaultValue={editingAnimal?.breed} type="text" placeholder="Breed" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <div className="grid grid-cols-2 gap-4">
                <select name="sex" defaultValue={editingAnimal?.sex} className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="Male">Male</option><option value="Female">Female</option>
                </select>
                <input name="weight" required defaultValue={editingAnimal?.current_weight_kg} type="number" step="0.1" placeholder="Weight (kg)" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-bold ml-1 uppercase">Date of Birth</label>
                <input name="dob" required defaultValue={editingAnimal ? new Date(editingAnimal.date_of_birth).toISOString().split('T')[0] : ''} type="date" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              {editingAnimal && (
                  <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-bold ml-1 uppercase">Health Status</label>
                      <select name="status" defaultValue={editingAnimal.health_status} className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                          <option value="Healthy">Healthy</option><option value="Sick">Sick / Injured</option><option value="Sold">Sold</option><option value="Deceased">Deceased</option>
                      </select>
                  </div>
              )}
              <Button type="submit" className="w-full mt-4">{editingAnimal ? "Update Animal" : "Save Animal"}</Button>
            </form>
        </Modal>
      )}

      {/* 2. Add Vaccination Modal */}
      {modalType === 'vaccine' && (
        <Modal title="Add Vaccination Record" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'vaccine')} className="space-y-4">
                <input name="v_name" required type="text" placeholder="Vaccine Name" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input name="v_batch" type="text" placeholder="Batch Number" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input name="v_vet" type="text" placeholder="Veterinarian Name" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input name="v_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <Button type="submit" className="w-full">Save Record</Button>
            </form>
        </Modal>
      )}

      {/* 3. Add Treatment Modal */}
      {modalType === 'treatment' && (
        <Modal title="Add Treatment Record" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'treatment')} className="space-y-4">
                <input name="t_condition" required type="text" placeholder="Condition / Illness" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input name="t_medication" required type="text" placeholder="Medication Used" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <div className="grid grid-cols-2 gap-4">
                    <input name="t_dosage" type="text" placeholder="Dosage" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    <input name="t_vet" type="text" placeholder="Vet Name" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <input name="t_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <textarea name="t_notes" rows={2} placeholder="Notes..." className="w-full border border-border bg-background text-foreground p-3 rounded-lg resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">Save Treatment</Button>
            </form>
        </Modal>
      )}

      {/* 4. Update Weight Modal */}
      {modalType === 'weight' && (
        <Modal title="Update Weight" onClose={() => setModalType(null)}>
            <form onSubmit={(e) => handleAddHistory(e, 'weight')} className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center mb-4 border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Current Weight</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{selectedAnimal?.current_weight_kg} kg</p>
                </div>
                <input name="w_weight" required type="number" step="0.1" placeholder="New Weight (kg)" className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="w_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-border bg-background text-foreground p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <textarea name="w_notes" rows={2} placeholder="Notes (e.g. Monthly weigh-in)" className="w-full border border-border bg-background text-foreground p-3 rounded-lg resize-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Update Weight</Button>
            </form>
        </Modal>
      )}
    </>
  );
}
