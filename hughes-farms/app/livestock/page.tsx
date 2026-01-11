// app/livestock/page.tsx
'use client';

import { useState } from 'react';
import { Cat, HeartPulse, Syringe, Plus, X, Weight, FileDown } from 'lucide-react';

// Mock Data
const initialLivestock = [
  {
    id: 1,
    animalId: 'COW001',
    species: 'Cattle',
    status: 'healthy',
    breed: 'N\'Dama',
    gender: 'female', 
    age: 40, // in months
    weight: 320, // in kg
    vaccinations: 2,
    treatments: 1,
    birthDate: 'Mar 15, 2022',
    weightHistory: [
      { date: 'Jan 01', weight: '310 kg' },
      { date: 'Feb 01', weight: '315 kg' },
      { date: 'Mar 01', weight: '320 kg' },
    ],
    vaccinationHistory: [
        { name: 'FMD Vaccine', date: 'Jan 15, 2024' },
        { name: 'Anthrax Vaccine', date: 'Feb 01, 2024' },
    ]
  },
  {
    id: 2,
    animalId: 'GOAT001',
    species: 'Goat',
    status: 'healthy',
    breed: 'West African Dwarf',
    gender: 'male',
    age: 26,
    weight: 25,
    vaccinations: 1,
    treatments: 0,
    birthDate: 'Jan 10, 2023',
    weightHistory: [],
    vaccinationHistory: []
  },
  {
    id: 3,
    animalId: 'PIG001',
    species: 'Pig',
    status: 'healthy',
    breed: 'Large White',
    gender: 'female',
    age: 23,
    weight: 85,
    vaccinations: 1,
    treatments: 0,
    birthDate: 'Apr 05, 2023',
    weightHistory: [],
    vaccinationHistory: []
  },
];

export default function LivestockManagement() {
  const [selectedAnimal, setSelectedAnimal] = useState<any>(initialLivestock[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col md:flex-row gap-6">
      
      {/* LEFT COLUMN: Animal List */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livestock Management</h1>
            <p className="text-gray-500">Monitor your animals' health and growth</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Animal
          </button>
        </div>

        <div className="space-y-4">
          {initialLivestock.map((animal) => (
            <div 
              key={animal.id}
              onClick={() => setSelectedAnimal(animal)}
              className={`bg-white p-6 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md 
                ${selectedAnimal?.id === animal.id ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {animal.animalId} - {animal.species}
                  </h3>
                  <p className="text-sm text-gray-500">Breed: {animal.breed}</p>
                </div>
                <StatusBadge status={animal.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <span>Gender: <span className='font-medium'>{animal.gender}</span></span>
                <span>Age: <span className='font-medium'>{animal.age} months</span></span>
                <span>Weight: <span className='font-medium'>{animal.weight} kg</span></span>
                <span>Vaccinations: <span className='font-medium'>{animal.vaccinations}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Animal Details Panel */}
      <div className="w-full md:w-96">
        {selectedAnimal ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{selectedAnimal.animalId}</h2>
              <p className="text-gray-500 font-medium">{selectedAnimal.breed}</p>
            </div>

            <div className="space-y-5">
              <DetailSection title="Basic Information">
                <DetailRow label="Gender" value={selectedAnimal.gender} capitalize />
                <DetailRow label="Birth Date" value={selectedAnimal.birthDate} />
                <DetailRow label="Current Weight" value={`${selectedAnimal.weight} kg`} />
                <DetailRow label="Health Status" value={<StatusBadge status={selectedAnimal.status} />} />
              </DetailSection>

              <DetailSection title="Recent Vaccinations">
                 {selectedAnimal.vaccinationHistory.map((v: any, i: number) => (
                    <HistoryItem key={i} title={v.name} date={v.date} icon={Syringe} color="green" />
                 ))}
              </DetailSection>

              <DetailSection title="Weight History">
                {selectedAnimal.weightHistory.map((wh: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                        <span className="text-gray-500">{wh.date}</span>
                        <span className="font-medium text-gray-800">{wh.weight}</span>
                    </div>
                ))}
              </DetailSection>

              {/* Action Buttons */}
              <div className="pt-4 grid grid-cols-2 gap-3">
                <ActionButton title="Add Vaccination" icon={Syringe} color="green" />
                <ActionButton title="Add Treatment" icon={HeartPulse} color="yellow" />
                <ActionButton title="Update Weight" icon={Weight} color="blue" />
                <ActionButton title="Health Booklet PDF" icon={FileDown} color="orange" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-gray-400 h-full">
            <Cat className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-center">Select an animal to view details and health records.</p>
          </div>
        )}
      </div>

      {/* MODAL: Add New Animal */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Animal</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <form className="space-y-4">
              <input type="text" placeholder="Animal ID" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              <select className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none">
                <option>Select Species</option>
                <option>Cattle</option>
                <option>Goat</option>
                <option>Pig</option>
              </select>
              <input type="text" placeholder="Breed" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none">
                    <option>Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                </select>
                <input type="text" placeholder="Current Weight (kg)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium ml-1">Date of Birth</label>
                <input type="date" className="w-full border border-gray-300 p-3 rounded-lg text-gray-600 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              
              <div className="flex gap-4 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors">Add Animal</button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}

// --- Helper Components ---
function Modal({ children, onClose }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">{children}</div>
          </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    healthy: 'bg-green-100 text-green-700',
    sick: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] || 'bg-gray-100'}`}>
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

function HistoryItem({ title, date, icon: Icon, color }: any) {
    const colors = {
        green: "text-green-600 bg-green-50",
        blue: "text-blue-600 bg-blue-50"
    }
    return (
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${colors[color as 'green' | 'blue']}`}>
               <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="font-medium text-sm text-gray-800">{title}</p>
                <p className="text-xs text-gray-500">{date}</p>
            </div>
        </div>
    )
}

function ActionButton({ title, icon: Icon, color }: any) {
    const colors = {
        green: 'bg-green-600 hover:bg-green-700',
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        blue: 'bg-blue-600 hover:bg-blue-700',
        orange: 'bg-orange-500 hover:bg-orange-600'
    }
    return (
        <button className={`w-full ${colors[color as 'green' | 'yellow' | 'blue' | 'orange']} text-white py-2.5 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition-colors`}>
            <Icon className="w-4 h-4" />
            {title}
        </button>
    )
}
