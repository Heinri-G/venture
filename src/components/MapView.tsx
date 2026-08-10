import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Navigation, Home } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import PlacesSearch from './PlacesSearch';
import PlaceDetails from './PlaceDetails';
import type { PlaceResult } from '../lib/places';
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
  address?: string;
  fsqId?: string;
  placeId?: string;
  saved?: boolean;
}

interface MapViewProps {
  markers?: MapMarker[];
  selectedLocation?: { latitude: number; longitude: number; name?: string } | null;
  onSelectMarker?: (markerId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  fullscreen?: boolean;
  showSearch?: boolean;
}

const DEFAULT_CENTER: [number, number] = [52.52, 13.405]; // Berlin
const DEFAULT_ZOOM = 12;
let searchMarkerCounter = 0;

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
  onMoveEnd,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  selectedLocation: MapViewProps['selectedLocation'];
  onMapClick?: (lat: number, lng: number) => void;
  onMoveEnd?: (center: { latitude: number; longitude: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    const handleClick = (e: L.LeafletMouseEvent) => onMapClick?.(e.latlng.lat, e.latlng.lng);
    const handleMoveEnd = () => {
      const center = map.getCenter();
      onMoveEnd?.({ latitude: center.lat, longitude: center.lng });
    };
    map.on('click', handleClick);
    map.on('moveend', handleMoveEnd);
    handleMoveEnd();
    return () => {
      map.off('click', handleClick);
      map.off('moveend', handleMoveEnd);
      mapRef.current = null;
    };
  }, [map, mapRef, onMapClick, onMoveEnd]);

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
  showSearch = false,
}: MapViewProps) {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const [loadedMarkers, setLoadedMarkers] = useState<MapMarker[]>([]);
  const [searchMarkers, setSearchMarkers] = useState<MapMarker[]>([]);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasExternalMarkers = markers !== undefined;
  const searchResultsRef = useRef<Map<string, PlaceResult>>(new Map());

  // When no markers are provided, load public places from Supabase (demo fallback).
  useEffect(() => {
    if (hasExternalMarkers) return;

    let mounted = true;
    async function loadPlaces() {
      setIsLoading(true);
      try {
        const { data, error, status } = await supabase
          .from('places')
          .select('id, name, latitude, longitude, category, photo_url, address, foursquare_fsq_id')
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
            data.map(
              (p: {
                id: unknown;
                name: unknown;
                latitude: unknown;
                longitude: unknown;
                category: unknown;
                photo_url: unknown;
                address: unknown;
                foursquare_fsq_id: unknown;
              }) => ({
                id: String(p.id),
                name: String(p.name),
                latitude: Number(p.latitude),
                longitude: Number(p.longitude),
                category: p.category ? String(p.category) : undefined,
                photoUrl: p.photo_url ? String(p.photo_url) : undefined,
                address: p.address ? String(p.address) : undefined,
                fsqId: p.foursquare_fsq_id ? String(p.foursquare_fsq_id) : undefined,
              })
            )
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

  const handlePlaceSelect = (place: PlaceResult) => {
    const marker: MapMarker = {
      id: place.fsq_id || `search-${++searchMarkerCounter}`,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      photoUrl: place.photoUrl,
      address: place.address,
      fsqId: place.fsq_id,
      placeId: place.fsq_id,
    };
    setSearchMarkers((prev) => (prev.some((m) => m.id === marker.id) ? prev : [...prev, marker]));
    if (place.fsq_id) {
      searchResultsRef.current.set(place.fsq_id, place);
    }
    mapRef.current?.flyTo([place.latitude, place.longitude], 14, { duration: 1.5 });
    setSelectedPlace(place);
  };

  const handleMarkerClick = (marker: MapMarker) => {
    if (onSelectMarker) {
      onSelectMarker(marker.id);
      return;
    }
    const stored = marker.fsqId ? searchResultsRef.current.get(marker.fsqId) : undefined;
    setSelectedPlace({
      fsq_id: stored?.fsq_id || marker.fsqId,
      name: marker.name,
      address: stored?.address || marker.address,
      latitude: marker.latitude,
      longitude: marker.longitude,
      category: stored?.category || marker.category,
      photoUrl: stored?.photoUrl || marker.photoUrl,
      phone: stored?.phone,
      website: stored?.website,
      hours: stored?.hours,
      description: stored?.description,
    });
  };

  const shownMarkers = useMemo(
    () => (markers ? markers : [...loadedMarkers, ...searchMarkers]),
    [markers, loadedMarkers, searchMarkers]
  );
  const center: [number, number] = useMemo(() => {
    const baseMarkers = markers ?? loadedMarkers;
    return baseMarkers.length
      ? [baseMarkers[0].latitude, baseMarkers[0].longitude]
      : DEFAULT_CENTER;
  }, [markers, loadedMarkers]);

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

        <MapController
          mapRef={mapRef}
          selectedLocation={selectedLocation}
          onMapClick={onMapClick}
          onMoveEnd={setMapCenter}
        />

        <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom disableClusteringAtZoom={14}>
          {shownMarkers.map((m) => (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              eventHandlers={{ click: () => handleMarkerClick(m) }}
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

      {showSearch && (
        <PlacesSearch
          onPlaceSelect={handlePlaceSelect}
          latitude={mapCenter?.latitude}
          longitude={mapCenter?.longitude}
          className="inset-x-4 top-[4.5rem]"
        />
      )}

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

      <PlaceDetails
        key={selectedPlace?.fsq_id || selectedPlace?.name || 'none'}
        place={selectedPlace}
        isOpen={Boolean(selectedPlace)}
        onClose={() => setSelectedPlace(null)}
      />
    </div>
  );
}
