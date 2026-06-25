'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix Leaflet icon paths in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

function LocationMarker({ position, setPosition }: any) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  
  // Center map when position changes from outside
  useEffect(() => {
      if (position) {
          map.flyTo(position, map.getZoom());
      }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

interface MapSelectorClientProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function MapSelectorClient({ latitude, longitude, onLocationSelect }: MapSelectorClientProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    latitude && longitude ? L.latLng(latitude, longitude) : null
  );
  
  const defaultCenter = position || L.latLng(7.9465, -1.0232); // Ghana

  useEffect(() => {
    if (position) {
      onLocationSelect(position.lat, position.lng);
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border border-border rounded-lg overflow-hidden h-[300px] w-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={position ? 15 : 6} 
        className="h-full w-full z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
      
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-400 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-full shadow-sm text-xs font-semibold border border-border pointer-events-none whitespace-nowrap">
        👆 Tap or click map to drop pin
      </div>
      
      <div className="absolute bottom-2 left-2 z-400 bg-background text-foreground p-1.5 rounded shadow-sm text-[10px] font-mono border border-border">
        {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'No location selected'}
      </div>
      
      <button 
        type="button"
        onClick={() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    const newPos = L.latLng(pos.coords.latitude, pos.coords.longitude);
                    setPosition(newPos);
                });
            }
        }}
        className="absolute bottom-4 right-2 z-400 bg-background text-foreground p-2 rounded shadow-md border border-border hover:bg-accent transition-colors flex items-center justify-center"
        title="Get Current Location"
      >
        <MapPin className="w-5 h-5" />
      </button>
    </div>
  );
}