import React, { memo, useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { List, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SavedPlaceWithDetails } from '@/lib/savedPlaces';

interface SavedPlacesMapProps {
  places: SavedPlaceWithDetails[];
  selectedPlaceId?: string | null;
  flyToTarget?: { id: string; latitude: number; longitude: number } | null;
  onSelectPlace: (place: SavedPlaceWithDetails) => void;
  onBackToList: () => void;
  loading?: boolean;
}

const DEFAULT_CENTER: [number, number] = [52.52, 13.405]; // Berlin
const DEFAULT_ZOOM = 12;

const savedIcon = L.divIcon({
  className: '',
  html: `
    <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg">
      <span class="size-2 rounded-full bg-current"></span>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

const selectedSavedIcon = L.divIcon({
  className: '',
  html: `
    <div class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-xl ring-4 ring-primary/30">
      <span class="size-2.5 rounded-full bg-current"></span>
    </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

function createClusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    className: '',
    html: `
      <div class="flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-lg">
        ${cluster.getChildCount()}
      </div>`,
    iconSize: [36, 36],
  });
}

// Drives the map: fits the saved-place bounds on mount and flies to a
// selected target whenever it changes.
function MapBehavior({
  places,
  flyToTarget,
}: {
  places: SavedPlaceWithDetails[];
  flyToTarget: SavedPlacesMapProps['flyToTarget'];
}) {
  const map = useMap();
  const lastFlyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (flyToTarget) {
      if (lastFlyIdRef.current === flyToTarget.id) return;
      lastFlyIdRef.current = flyToTarget.id;
      map.flyTo([flyToTarget.latitude, flyToTarget.longitude], 14, { duration: 1.2 });
      return;
    }

    if (places.length > 0) {
      const bounds = L.latLngBounds(
        places.map((p) => [p.place.latitude, p.place.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [48, 48] });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, places, flyToTarget]);

  return null;
}

function SavedPlacesMap({
  places,
  selectedPlaceId,
  flyToTarget,
  onSelectPlace,
  onBackToList,
  loading = false,
}: SavedPlacesMapProps) {
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

  return (
    <div className="relative isolate h-full w-full overflow-hidden bg-muted">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBehavior places={places} flyToTarget={flyToTarget} />

        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom
          disableClusteringAtZoom={14}
          iconCreateFunction={createClusterIcon}
        >
          {places.map((sp) => (
            <Marker
              key={sp.id}
              position={[sp.place.latitude, sp.place.longitude]}
              icon={selectedPlaceId === sp.id ? selectedSavedIcon : savedIcon}
              eventHandlers={{ click: () => onSelectPlace(sp) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <Button
        onClick={onBackToList}
        aria-label="Back to list"
        title="Back to list"
        variant="outline"
        size="icon-lg"
        className="absolute left-4 top-4 z-[1100] size-11 rounded-full bg-background text-primary shadow-lg"
      >
        <List />
      </Button>

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

export default memo(SavedPlacesMap);
