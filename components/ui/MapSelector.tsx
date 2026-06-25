'use client';

import dynamic from 'next/dynamic';

const MapSelectorClient = dynamic(
  () => import('./MapSelectorClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full rounded-lg bg-accent animate-pulse border border-border flex items-center justify-center">
        <span className="text-muted-foreground text-sm font-medium">Loading Map...</span>
      </div>
    )
  }
);

interface MapSelectorProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onLocationSelect: (lat: number, lng: number) => void;
}

export function MapSelector(props: MapSelectorProps) {
  return <MapSelectorClient {...props} />;
}
