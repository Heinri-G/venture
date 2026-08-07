'use client';

import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  isSaved?: boolean;
}

interface MapViewProps {
  markers?: MapMarker[];
  selectedLocation?: { latitude: number; longitude: number; name?: string } | null;
  onSelectMarker?: (markerId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapView({
  markers = [],
  selectedLocation,
  onSelectMarker,
  onMapClick,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const activeMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const defaultToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!defaultToken) {
      console.warn('Mapbox access token missing from NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN');
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [2.3522, 48.8566], // Default: Paris
      zoom: 12,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.current.on('click', (e) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    Object.values(activeMarkers.current).forEach((m) => m.remove());
    activeMarkers.current = {};

    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = `w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 ${
        marker.isSaved
          ? 'bg-indigo-600 text-white border-2 border-white'
          : 'bg-amber-500 text-white border-2 border-white'
      }`;
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectMarker) onSelectMarker(marker.id);
      });

      const mapboxMarker = new mapboxgl.Marker(el)
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map.current!);

      activeMarkers.current[marker.id] = mapboxMarker;
    });
  }, [markers, onSelectMarker]);

  // Fly to selected location
  useEffect(() => {
    if (!map.current || !selectedLocation) return;

    map.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 14,
      essential: true,
      duration: 1500,
    });
  }, [selectedLocation]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !map.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Floating Controls */}
      <div className="absolute right-4 top-20 z-10 flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className="w-11 h-11 glass rounded-2xl flex items-center justify-center text-foreground shadow-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-base active:scale-95 border border-white/20"
          title="Current location"
        >
          <Navigation size={20} className="text-primary" />
        </button>
      </div>
    </div>
  );
}
