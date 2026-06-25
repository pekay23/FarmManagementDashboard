'use client';

import { Cat } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface AnimalListProps {
  filteredAnimals: any[];
  selectedAnimal: any;
  onSelectAnimal: (animal: any) => void;
}

export function AnimalList({ filteredAnimals, selectedAnimal, onSelectAnimal }: AnimalListProps) {
  if (filteredAnimals.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center flex-1">
        <Cat className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No animals added yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full grid grid-cols-1 gap-4">
      {filteredAnimals.map((animal: any) => (
        <div 
          key={animal.id}
          onClick={() => onSelectAnimal(animal)}
          className={`bg-card text-card-foreground p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md 
            ${selectedAnimal?.id === animal.id ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border'}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold">
                {animal.animal_id} <span className="text-muted-foreground font-normal">|</span> {animal.species}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Breed: {animal.breed}</p>
            </div>
            <StatusBadge status={animal.health_status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground border-t border-border pt-3">
            <span>Gender: <span className='font-medium text-foreground'>{animal.sex}</span></span>
            <span>Weight: <span className='font-medium text-foreground'>{animal.current_weight_kg} kg</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}
