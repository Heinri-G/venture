import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popup } from 'maplibre-gl';
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import { useNavigate } from 'react-router-dom';
import { Navigation, Home } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import PlacesSearch from './PlacesSearch';
import PlaceDetails from './PlaceDetails';
import { useMapLibre } from '../hooks/useMapLibre';
import { PRIMARY, MARKER_STROKE } from '../lib/map/colors';
import type { PlaceResult } from '../lib/places';
import type { FeatureCollection } from 'geojson';

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

const DEFAULT_CENTER: [number, number] = [13.405, 52.52]; // Berlin
const DEFAULT_ZOOM = 12;
const CLUSTER_RADIUS = 50;
const PLACES_SOURCE = 'mapview-places';
const CLUSTER_LAYER = 'mapview-clusters';
const CLUSTER_COUNT_LAYER = 'mapview-cluster-count';
const POINT_LAYER = 'mapview-points';
let searchMarkerCounter = 0;

// Demo markers must never reach a production surface — dev builds only.
const DEMO_MARKERS_ENABLED = import.meta.env.DEV;

const DEMO_MARKERS: MapMarker[] = [
  { id: 'demo-1', name: 'Demo Coffee — Mitte', latitude: 52.5208, longitude: 13.4095, category: 'Coffee Shop' },
  { id: 'demo-2', name: 'Demo Park', latitude: 52.5163, longitude: 13.3777, category: 'Park' },
  { id: 'demo-3', name: 'Demo Museum', latitude: 52.5194, longitude: 13.401, category: 'Museum' },
];

function buildPopupContent(marker: MapMarker): HTMLElement {
  const root = document.createElement('div');
  root.className = 'text-sm';
  const name = document.createElement('div');
  name.className = 'font-semibold';
  name.textContent = marker.name;
  root.appendChild(name);
  if (marker.category) {
    const category = document.createElement('div');
    category.className = 'text-muted-foreground';
    category.textContent = marker.category;
    root.appendChild(category);
  }
  if (marker.photoUrl) {
    const img = document.createElement('img');
    img.src = marker.photoUrl;
    img.alt = marker.name;
    img.className = 'mt-2 h-24 w-full rounded-lg object-cover';
    root.appendChild(img);
  }
  return root;
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
  const { containerRef, map } = useMapLibre({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  const [loadedMarkers, setLoadedMarkers] = useState<MapMarker[]>([]);
  const [searchMarkers, setSearchMarkers] = useState<MapMarker[]>([]);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasExternalMarkers = markers !== undefined;
  const searchResultsRef = useRef<Map<string, PlaceResult>>(new Map());
  const popupRef = useRef<Popup | null>(null);

  const onSelectMarkerRef = useRef(onSelectMarker);
  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
  });
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });

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
          if (mounted) setLoadedMarkers(tableMissing && DEMO_MARKERS_ENABLED ? DEMO_MARKERS : []);
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
        if (mounted) setLoadedMarkers(DEMO_MARKERS_ENABLED ? DEMO_MARKERS : []);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadPlaces();
    return () => {
      mounted = false;
    };
  }, [hasExternalMarkers]);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    if (onSelectMarkerRef.current) {
      onSelectMarkerRef.current(marker.id);
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
  }, []);

  const shownMarkers = useMemo(
    () => (markers ? markers : [...loadedMarkers, ...searchMarkers]),
    [markers, loadedMarkers, searchMarkers]
  );

  const featureCollection = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: shownMarkers.map((m) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
        properties: {
          id: m.id,
          name: m.name,
          category: m.category ?? null,
          photoUrl: m.photoUrl ?? null,
          address: m.address ?? null,
          fsqId: m.fsqId ?? null,
        },
      })),
    }),
    [shownMarkers]
  );

  // Cluster source + layers. Re-applies after a style reload (theme flip).
  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if (!map.getSource(PLACES_SOURCE)) {
        map.addSource(PLACES_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: CLUSTER_RADIUS,
        });
        map.addLayer({
          id: CLUSTER_LAYER,
          type: 'circle',
          source: PLACES_SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': PRIMARY,
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 100, 34],
            'circle-stroke-width': 2,
            'circle-stroke-color': MARKER_STROKE,
          },
        });
        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: 'symbol',
          source: PLACES_SOURCE,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
          },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: POINT_LAYER,
          type: 'circle',
          source: PLACES_SOURCE,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': PRIMARY,
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': MARKER_STROKE,
          },
        });
      }
      (map.getSource(PLACES_SOURCE) as GeoJSONSource).setData(featureCollection);
    };

    map.on('style.load', apply);
    if (map.isStyleLoaded()) apply();
    return () => {
      map.off('style.load', apply);
    };
  }, [map, featureCollection]);

  // Interactions: cluster zoom, marker popup + sheet, empty-map click, moveend.
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: MapMouseEvent) => {
      popupRef.current?.remove();
      popupRef.current = null;

      const clusterFeatures = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      if (clusterFeatures.length > 0) {
        e.preventDefault();
        const clusterId = clusterFeatures[0].properties?.cluster_id as number;
        const source = map.getSource(PLACES_SOURCE) as GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: (clusterFeatures[0].geometry as { type: 'Point'; coordinates: [number, number] })
                .coordinates,
              zoom,
            });
          })
          .catch(() => undefined);
        return;
      }

      const pointFeatures = map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER] });
      if (pointFeatures.length > 0) {
        e.preventDefault();
        const feature = pointFeatures[0];
        const props = feature.properties as Record<string, unknown>;
        const marker: MapMarker = {
          id: String(props.id ?? ''),
          name: String(props.name ?? ''),
          latitude: (feature.geometry as { type: 'Point'; coordinates: [number, number] }).coordinates[1],
          longitude: (feature.geometry as { type: 'Point'; coordinates: [number, number] }).coordinates[0],
          category: props.category ? String(props.category) : undefined,
          photoUrl: props.photoUrl ? String(props.photoUrl) : undefined,
          address: props.address ? String(props.address) : undefined,
          fsqId: props.fsqId ? String(props.fsqId) : undefined,
        };
        if (!marker.id) return;
        const popup = new Popup({ offset: 25 })
          .setLngLat([marker.longitude, marker.latitude])
          .setDOMContent(buildPopupContent(marker));
        popup.addTo(map);
        popupRef.current = popup;
        handleMarkerClick(marker);
        return;
      }

      onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    };

    const handleMoveEnd = () => {
      const c = map.getCenter();
      setMapCenter({ latitude: c.lat, longitude: c.lng });
    };

    map.on('click', handleClick);
    map.on('moveend', handleMoveEnd);
    handleMoveEnd();
    return () => {
      map.off('click', handleClick);
      map.off('moveend', handleMoveEnd);
    };
  }, [map, handleMarkerClick]);

  // Fly to a selected location whenever it changes.
  useEffect(() => {
    if (!map || !selectedLocation) return;
    map.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 14,
      duration: 1500,
    });
  }, [map, selectedLocation]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
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
    map?.flyTo({
      center: [place.longitude, place.latitude],
      zoom: 14,
      duration: 1500,
    });
    setSelectedPlace(place);
  };

  return (
    <div
      className={`relative isolate w-full overflow-hidden bg-muted ${
        fullscreen ? 'h-dvh' : 'h-full'
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />

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
