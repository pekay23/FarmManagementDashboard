'use client';

import { Cat, Pencil, Trash2, Syringe, HeartPulse, Weight, FileDown } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/DetailRow';
import { ActionButton } from '@/components/ui/ActionButton';

interface AnimalDetailProps {
  selectedAnimal: any;
  vaccines: any[];
  onEdit: () => void;
  onDelete: () => void;
  onVaccinate: () => void;
  onTreat: () => void;
  onWeigh: () => void;
  onDownloadPDF: () => void;
}

export function AnimalDetail({
  selectedAnimal,
  vaccines,
  onEdit,
  onDelete,
  onVaccinate,
  onTreat,
  onWeigh,
  onDownloadPDF
}: AnimalDetailProps) {
  if (!selectedAnimal) {
    return (
      <div className="hidden lg:flex w-96 bg-accent/50 rounded-xl border-2 border-dashed border-border p-10 flex-col items-center justify-center text-muted-foreground h-64 sticky top-4">
          <Cat className="w-12 h-12 mb-2 opacity-20" />
          <p>Select an animal to view details</p>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-96 bg-card text-card-foreground rounded-xl shadow-lg border border-border p-6 sticky top-4 animate-in slide-in-from-right-4 duration-300">
      <div className="mb-6 pb-6 border-b border-border flex justify-between items-start">
        <div>
            <h2 className="text-xl font-bold">{selectedAnimal.animal_id}</h2>
            <p className="text-muted-foreground font-medium">{selectedAnimal.breed}</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onEdit}
            className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-primary transition-colors"
          >
              <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete} 
            className="p-2 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive transition-colors"
          >
              <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <DetailRow label="Gender" value={selectedAnimal.sex} capitalize />
          <DetailRow label="Birth Date" value={new Date(selectedAnimal.date_of_birth).toLocaleDateString()} />
          <DetailRow label="Current Weight" value={`${selectedAnimal.current_weight_kg} kg`} />
          <DetailRow label="Health Status" value={<StatusBadge status={selectedAnimal.health_status} />} />
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide opacity-70 mb-2">Recent Vaccinations</h4>
          {vaccines.slice(0, 3).map((v: any, i: number) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <span className="text-primary font-medium">{v.vaccine_name}</span>
                  <span className="text-muted-foreground text-xs">{new Date(v.date).toLocaleDateString()}</span>
              </div>
          ))}
          {vaccines.length === 0 && <p className="text-xs text-muted-foreground italic">No records.</p>}
        </div>
        <div className="pt-4 grid grid-cols-2 gap-3">
          <ActionButton title="Vaccination" icon={Syringe} color="primary" onClick={onVaccinate} />
          <ActionButton title="Treatment" icon={HeartPulse} color="yellow" onClick={onTreat} />
          <ActionButton title="Weigh In" icon={Weight} color="blue" onClick={onWeigh} />
          <ActionButton title="Health PDF" icon={FileDown} color="dark" onClick={onDownloadPDF} />
        </div>
      </div>
    </div>
  );
}
