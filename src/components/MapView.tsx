import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { supabase } from '../lib/supabase/client';

// Fix default icon paths for Vite
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x as unknown as string,
  iconUrl: markerIcon as unknown as string,
  shadowUrl: markerShadow as unknown as string,
});

export interface PlaceMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
}

const DEMO_MARKERS: PlaceMarker[] = [
  { id: 'demo-1', name: 'Demo Coffee — Mitte', latitude: 52.5208, longitude: 13.4095, photo_url: '' },
  { id: 'demo-2', name: 'Demo Park', latitude: 52.5163, longitude: 13.3777, photo_url: '' },
  { id: 'demo-3', name: 'Demo Museum', latitude: 52.5194, longitude: 13.4010, photo_url: '' },
];

export default function MapView() {
  const [markers, setMarkers] = useState<PlaceMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadPlaces() {
      try {
        // Try to fetch public places; adjust table name if needed
        const { data, error, status } = await supabase
          .from('places')
          .select('id, name, latitude, longitude, photo_url')
          .limit(500);

        if (error) {
          console.error('Supabase fetch error', error);

          // Fallback when table doesn't exist (e.g., migration not applied)
          const notFound = error.code === 'PGRST205' || (status === 404) || (error.message && error.message.includes("Could not find the table"));
          if (notFound) {
            console.warn('Places table not found — falling back to demo markers');
            if (mounted) setMarkers(DEMO_MARKERS);
          } else {
            if (mounted) setMarkers([]);
          }
        } else if (mounted && data) {
          const parsed = (data as any[]).map((p) => ({
            id: String(p.id),
            name: p.name,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            photo_url: p.photo_url || undefined,
          }));
          setMarkers(parsed);
        }
      } catch (err: any) {
        console.error('Error loading places', err);
        if (mounted) setMarkers(DEMO_MARKERS);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPlaces();
    return () => { mounted = false; };
  }, []);

  // center on first marker if available
  const center: [number, number] = markers.length ? [markers[0].latitude, markers[0].longitude] : [51.505, -0.09];

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup>
          {markers.map((m) => (
            <Marker key={m.id} position={[m.latitude, m.longitude]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{m.name}</div>
                  {m.photo_url && <img src={m.photo_url} alt={m.name} className="mt-2 w-full h-24 object-cover rounded" />}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      {loading && <div className="text-sm text-gray-500 p-2">Loading places...</div>}
    </div>
  );
}
