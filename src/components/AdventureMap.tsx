import React, { memo, useEffect, useRef } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AdventureMapPlace {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface AdventureMapProps {
  places: AdventureMapPlace[];
  selectedPlaceKey?: string | null;
  flyToTarget?: { key: string; latitude: number; longitude: number } | null;
  onSelectPlace?: (place: AdventureMapPlace) => void;
  showRoute?: boolean;
  loading?: boolean;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [52.52, 13.405]; // Berlin
const DEFAULT_ZOOM = 12;

function numberedIcon(index: number, selected: boolean) {
  return L.divIcon({
    className: '',
    html: `
      <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-lg ${selected ? 'ring-4 ring-primary/30' : ''}">
        ${index + 1}
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

// Fits the adventure's bounds on load and flies to a selected target.
function MapBehavior({
  places,
  flyToTarget,
}: {
  places: AdventureMapPlace[];
  flyToTarget: AdventureMapProps['flyToTarget'];
}) {
  const map = useMap();
  const fittedRef = useRef(false);
  const lastFlyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (flyToTarget) {
      if (lastFlyKeyRef.current === flyToTarget.key) return;
      lastFlyKeyRef.current = flyToTarget.key;
      map.flyTo([flyToTarget.latitude, flyToTarget.longitude], 14, { duration: 1.2 });
      return;
    }

    if (!fittedRef.current && places.length > 0) {
      fittedRef.current = true;
      const bounds = L.latLngBounds(
        places.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [48, 48] });
    } else if (places.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, places, flyToTarget]);

  return null;
}

function AdventureMap({
  places,
  selectedPlaceKey,
  flyToTarget,
  onSelectPlace,
  showRoute = true,
  loading = false,
  className,
}: AdventureMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo([position.coords.latitude, position.coords.longitude], 14, {
          duration: 1.5,
        });
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );
  };

  const positions = places.map((p) => [p.latitude, p.longitude] as [number, number]);

  return (
    <div className={cn('relative isolate h-full w-full overflow-hidden bg-muted', className)}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBehavior places={places} flyToTarget={flyToTarget} />

        {showRoute && positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: '#4f46e5', weight: 3, opacity: 0.8 }}
          />
        )}

        {places.map((place, index) => (
          <Marker
            key={place.key}
            position={[place.latitude, place.longitude]}
            icon={numberedIcon(index, selectedPlaceKey === place.key)}
            eventHandlers={{ click: () => onSelectPlace?.(place) }}
          />
        ))}
      </MapContainer>

      <Button
        onClick={handleLocateMe}
        aria-label="Current location"
        title="Current location"
        variant="outline"
        size="icon-lg"
        className="absolute right-4 top-4 z-[1100] size-11 rounded-full bg-background text-primary shadow-lg"
      >
        <Navigation />
      </Button>

      {loading && (
        <Badge
          variant="secondary"
          className="absolute left-1/2 top-4 z-[1100] -translate-x-1/2 shadow"
        >
          Loading places...
        </Badge>
      )}
    </div>
  );
}

export default memo(AdventureMap);
