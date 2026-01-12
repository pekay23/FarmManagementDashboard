// app/crops/page.tsx
'use client';

import { useState } from 'react';
import { Sprout, MapPin, Calendar, BarChart3, Plus, X, Droplets, Scissors } from 'lucide-react';

// Mock data matching IMG_4168
const initialCrops = [
  {
    id: 1,
    plot: 'Plot A001',
    type: 'Maize',
    status: 'growing',
    location: 'North Field',
    planted: 'Jan 15, 2024',
    size: '2.5 acres',
    variety: 'Abontem',
    expectedYield: '1200 kg',
    actualYield: null
  },
  {
    id: 2,
    plot: 'Plot B002',
    type: 'Rice',
    status: 'planted',
    location: 'Rice Paddy',
    planted: 'Feb 01, 2024',
    size: '1.8 acres',
    variety: 'Jasmine',
    expectedYield: '800 kg',
    actualYield: null
  },
  {
    id: 3,
    plot: 'Plot C003',
    type: 'Tomato',
    status: 'harvested',
    location: 'Greenhouse 1',
    planted: 'Jan 20, 2024',
    size: '0.5 acres',
    variety: 'Roma',
    expectedYield: '300 kg',
    actualYield: '350 kg'
  }
];

export default function CropManagement() {
  const [selectedCrop, setSelectedCrop] = useState<any>(initialCrops[0]); // Default to first crop
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col md:flex-row gap-6">
      
      {/* LEFT COLUMN: Crop List */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crop Management</h1>
            <p className="text-gray-500">Manage your farm plots and crop activities</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Crop
          </button>
        </div>

        <div className="space-y-4">
          {initialCrops.map((crop) => (
            <div 
              key={crop.id}
              onClick={() => setSelectedCrop(crop)}
              className={`bg-white p-6 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md 
                ${selectedCrop?.id === crop.id ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {crop.plot} - {crop.type}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{crop.location}</span>
                  </div>
                </div>
                <StatusBadge status={crop.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>Size: {crop.size}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Planted: {crop.planted}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Crop Details Panel */}
      <div className="w-full md:w-96">
        {selectedCrop ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{selectedCrop.plot} Details</h2>
              <p className="text-gray-500 font-medium">{selectedCrop.type} - {selectedCrop.variety}</p>
            </div>

            <div className="space-y-6">
              <DetailSection title="Plot Information">
                <DetailRow label="Location" value={selectedCrop.location} />
                <DetailRow label="Size" value={selectedCrop.size} />
                <DetailRow label="Status" value={selectedCrop.status} capitalize />
              </DetailSection>

              <DetailSection title="Timeline">
                 <DetailRow label="Planted" value={selectedCrop.planted} />
                 <DetailRow label="Expected Harvest" value="Jun 15, 2024" />
              </DetailSection>

              <DetailSection title="Yield Tracking">
                <DetailRow label="Estimated" value={selectedCrop.expectedYield} />
                <DetailRow label="Actual" value={selectedCrop.actualYield || 'Not harvested'} />
              </DetailSection>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h5 className="text-sm font-semibold text-blue-800 mb-2">Recent Treatments</h5>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Droplets className="w-4 h-4" />
                  <span>NPK 15-15-15 (50kg)</span>
                </div>
                <p className="text-xs text-blue-500 mt-1 ml-6">Feb 01 - Applied to roots</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" /> Add Treatment
                </button>
                <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors">
                  <Scissors className="w-4 h-4" /> Update Yield
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-gray-400 h-full">
            <Sprout className="w-12 h-12 mb-2 opacity-20" />
            <p>Select a crop to view details</p>
          </div>
        )}
      </div>

      {/* MODAL: Add New Crop */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Crop</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <form className="space-y-4">
              <input type="text" placeholder="Plot Number" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              <input type="text" placeholder="Crop Type (e.g., Maize, Rice)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Variety" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="text" placeholder="Plot Size (acres)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <input type="text" placeholder="Location" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                 <input type="text" placeholder="Est. Yield (kg)" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium ml-1">Planting Date</label>
                <input type="date" className="w-full border border-gray-300 p-3 rounded-lg text-gray-600 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              
              <div className="flex gap-4 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors">Add Crop</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    growing: 'bg-yellow-100 text-yellow-700',
    planted: 'bg-green-100 text-green-700',
    harvested: 'bg-blue-100 text-blue-700'
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
    <div className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}
