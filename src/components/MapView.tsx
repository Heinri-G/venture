import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Navigation, Home } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon paths for Vite bundling
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x as unknown as string,
  iconUrl: markerIcon as unknown as string,
  shadowUrl: markerShadow as unknown as string,
});

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  photoUrl?: string;
  placeId?: string;
  saved?: boolean;
}

interface MapViewProps {
  markers?: MapMarker[];
  selectedLocation?: { latitude: number; longitude: number; name?: string } | null;
  onSelectMarker?: (markerId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  fullscreen?: boolean;
}

const DEFAULT_CENTER: [number, number] = [52.52, 13.405]; // Berlin
const DEFAULT_ZOOM = 12;

const DEMO_MARKERS: MapMarker[] = [
  { id: 'demo-1', name: 'Demo Coffee — Mitte', latitude: 52.5208, longitude: 13.4095, category: 'Coffee Shop' },
  { id: 'demo-2', name: 'Demo Park', latitude: 52.5163, longitude: 13.3777, category: 'Park' },
  { id: 'demo-3', name: 'Demo Museum', latitude: 52.5194, longitude: 13.401, category: 'Museum' },
];

// Bridges the react-leaflet map instance out to a ref and wires click/selection handlers.
function MapController({
  mapRef,
  selectedLocation,
  onMapClick,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  selectedLocation: MapViewProps['selectedLocation'];
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    const handleClick = (e: L.LeafletMouseEvent) => onMapClick?.(e.latlng.lat, e.latlng.lng);
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
      mapRef.current = null;
    };
  }, [map, mapRef, onMapClick]);

  // Fly to a selected location whenever it changes.
  useEffect(() => {
    if (!selectedLocation) return;
    map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 14, { duration: 1.5 });
  }, [map, selectedLocation]);

  return null;
}

export default function MapView({
  markers,
  selectedLocation,
  onSelectMarker,
  onMapClick,
  fullscreen = false,
}: MapViewProps) {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const [loadedMarkers, setLoadedMarkers] = useState<MapMarker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasExternalMarkers = markers !== undefined;

  // When no markers are provided, load public places from Supabase (demo fallback).
  useEffect(() => {
    if (hasExternalMarkers) return;

    let mounted = true;
    async function loadPlaces() {
      setIsLoading(true);
      try {
        const { data, error, status } = await supabase
          .from('places')
          .select('id, name, latitude, longitude, category, photo_url')
          .limit(500);

        if (error) {
          console.error('Supabase fetch error', error);
          const tableMissing =
            error.code === 'PGRST205' ||
            status === 404 ||
            (error.message ?? '').includes('Could not find the table');
          if (mounted) setLoadedMarkers(tableMissing ? DEMO_MARKERS : []);
        } else if (mounted && data) {
          setLoadedMarkers(
            data.map((p: { id: unknown; name: unknown; latitude: unknown; longitude: unknown; category: unknown; photo_url: unknown }) => ({
              id: String(p.id),
              name: String(p.name),
              latitude: Number(p.latitude),
              longitude: Number(p.longitude),
              category: p.category ? String(p.category) : undefined,
              photoUrl: p.photo_url ? String(p.photo_url) : undefined,
            }))
          );
        }
      } catch (err) {
        console.error('Error loading places', err);
        if (mounted) setLoadedMarkers(DEMO_MARKERS);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadPlaces();
    return () => {
      mounted = false;
    };
  }, [hasExternalMarkers]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo([position.coords.latitude, position.coords.longitude], 14, { duration: 1.5 });
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );
  };

  const shownMarkers = markers ?? loadedMarkers;
  const center: [number, number] = shownMarkers.length
    ? [shownMarkers[0].latitude, shownMarkers[0].longitude]
    : DEFAULT_CENTER;

  return (
    <div
      className={`relative isolate w-full overflow-hidden bg-muted ${
        fullscreen ? 'h-dvh' : 'h-full'
      }`}
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController mapRef={mapRef} selectedLocation={selectedLocation} onMapClick={onMapClick} />

        <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom disableClusteringAtZoom={14}>
          {shownMarkers.map((m) => (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              eventHandlers={{ click: () => onSelectMarker?.(m.id) }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{m.name}</div>
                  {m.category && <div className="text-muted-foreground">{m.category}</div>}
                  {m.photoUrl && (
                    <>
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        className="mt-2 h-24 w-full rounded-lg object-cover"
                      />
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {fullscreen && (
        <Button
          onClick={() => navigate('/')}
          aria-label="Back to home"
          variant="outline"
          size="icon-lg"
          className="absolute left-4 top-4 z-[1100] size-11 rounded-full bg-background shadow-lg"
        >
          <Home />
        </Button>
      )}

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

      {isLoading && !hasExternalMarkers && (
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
