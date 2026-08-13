import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LngLatBounds, Marker } from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMapLibre } from '@/hooks/useMapLibre';
import { fetchRoute } from '@/lib/routing';
import type { Feature, LineString } from 'geojson';

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

const DEFAULT_CENTER: [number, number] = [13.405, 52.52]; // Berlin
const DEFAULT_ZOOM = 12;
const ROUTE_COLOR = '#4f46e5';
const ROUTE_SOURCE = 'adventure-route';
const ROUTE_LAYER = 'adventure-route-line';

function numberedMarkerElement(index: number, selected: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = cn(
    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-lg',
    selected && 'ring-4 ring-primary/30'
  );
  el.textContent = String(index + 1);
  return el;
}

function boundsFromPlaces(places: AdventureMapPlace[]) {
  const bounds = new LngLatBounds();
  places.forEach((p) => bounds.extend([p.longitude, p.latitude]));
  return bounds;
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
  const { containerRef, map } = useMapLibre({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  const [routeLine, setRouteLine] = useState<Feature<LineString> | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const fittedRef = useRef(false);
  const lastFlyKeyRef = useRef<string | null>(null);

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  });

  // Fits the adventure's bounds on load and flies to a selected target.
  useEffect(() => {
    if (!map) return;

    if (flyToTarget) {
      if (lastFlyKeyRef.current === flyToTarget.key) return;
      lastFlyKeyRef.current = flyToTarget.key;
      map.flyTo({
        center: [flyToTarget.longitude, flyToTarget.latitude],
        zoom: 14,
        duration: 1200,
      });
      return;
    }

    if (!fittedRef.current && places.length > 0) {
      fittedRef.current = true;
      map.fitBounds(boundsFromPlaces(places), { padding: 48 });
    } else if (places.length === 0) {
      map.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  }, [map, places, flyToTarget]);

  // Numbered HTML markers with a selection ring.
  useEffect(() => {
    if (!map) return;
    const markers = places.map((place, index) => {
      const el = numberedMarkerElement(index, selectedPlaceKey === place.key);
      el.addEventListener('click', () => onSelectPlaceRef.current?.(place));
      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      return marker;
    });
    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [map, places, selectedPlaceKey]);

  const routePositions = useCallback(
    () => places.map((p) => [p.longitude, p.latitude] as [number, number]),
    [places]
  );

  // Route: OSRM line, falling back to a straight polyline on error.
  useEffect(() => {
    let cancelled = false;

    async function updateRoute() {
      if (!showRoute || places.length < 2) {
        setRouteLoading(false);
        setRouteLine(null);
        return;
      }
      const waypoints = routePositions();
      setRouteLoading(true);
      try {
        const route = await fetchRoute(waypoints);
        if (cancelled) return;
        setRouteLine({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: route },
        });
      } catch {
        if (cancelled) return;
        setRouteLine({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: waypoints },
        });
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }

    void updateRoute();
    return () => {
      cancelled = true;
    };
  }, [showRoute, places, routePositions]);

  // Route line layer. Re-applies after a style reload (theme flip).
  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if (!routeLine) {
        if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
        if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
        return;
      }
      if (!map.getSource(ROUTE_SOURCE)) {
        map.addSource(ROUTE_SOURCE, { type: 'geojson', data: routeLine });
        map.addLayer({
          id: ROUTE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ROUTE_COLOR, 'line-width': 3, 'line-opacity': 0.8 },
        });
      } else {
        (map.getSource(ROUTE_SOURCE) as GeoJSONSource).setData(routeLine);
      }
    };

    map.on('style.load', apply);
    if (map.isStyleLoaded()) apply();
    return () => {
      map.off('style.load', apply);
    };
  }, [map, routeLine]);

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

  return (
    <div className={cn('relative isolate h-full w-full overflow-hidden bg-muted', className)}>
      <div ref={containerRef} className="h-full w-full" />

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

      {routeLoading && showRoute && places.length > 1 && (
        <Badge
          variant="secondary"
          className="absolute left-1/2 top-4 z-[1100] -translate-x-1/2 shadow"
        >
          Planning route...
        </Badge>
      )}
    </div>
  );
}

export default memo(AdventureMap);
