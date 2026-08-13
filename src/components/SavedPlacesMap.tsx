import { memo, useEffect, useMemo, useRef } from 'react';
import { LngLatBounds } from 'maplibre-gl';
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import { List, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMapLibre } from '@/hooks/useMapLibre';
import type { SavedPlaceWithDetails } from '@/lib/savedPlaces';
import type { FeatureCollection } from 'geojson';

interface SavedPlacesMapProps {
  places: SavedPlaceWithDetails[];
  selectedPlaceId?: string | null;
  flyToTarget?: { id: string; latitude: number; longitude: number } | null;
  onSelectPlace: (place: SavedPlaceWithDetails) => void;
  onBackToList: () => void;
  loading?: boolean;
}

const DEFAULT_CENTER: [number, number] = [13.405, 52.52]; // Berlin
const DEFAULT_ZOOM = 12;
const CLUSTER_RADIUS = 50;
const PRIMARY = '#5450e6';
const PLACES_SOURCE = 'saved-places';
const CLUSTER_LAYER = 'saved-places-clusters';
const CLUSTER_COUNT_LAYER = 'saved-places-cluster-count';
const POINT_LAYER = 'saved-places-points';

function boundsFromPlaces(places: SavedPlaceWithDetails[]) {
  const bounds = new LngLatBounds();
  places.forEach((p) => bounds.extend([p.place.longitude, p.place.latitude]));
  return bounds;
}

function SavedPlacesMap({
  places,
  selectedPlaceId,
  flyToTarget,
  onSelectPlace,
  onBackToList,
  loading = false,
}: SavedPlacesMapProps) {
  const { containerRef, map } = useMapLibre({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  const lastFlyIdRef = useRef<string | null>(null);
  const placesRef = useRef(places);
  useEffect(() => {
    placesRef.current = places;
  });
  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  });

  const featureCollection = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: places.map((sp) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [sp.place.longitude, sp.place.latitude] },
        properties: { id: sp.id, selected: sp.id === selectedPlaceId },
      })),
    }),
    [places, selectedPlaceId]
  );

  // Drives the map: fits the saved-place bounds and flies to a selected target.
  useEffect(() => {
    if (!map) return;

    if (flyToTarget) {
      if (lastFlyIdRef.current === flyToTarget.id) return;
      lastFlyIdRef.current = flyToTarget.id;
      map.flyTo({
        center: [flyToTarget.longitude, flyToTarget.latitude],
        zoom: 14,
        duration: 1200,
      });
      return;
    }

    if (places.length > 0) {
      map.fitBounds(boundsFromPlaces(places), { padding: 48 });
    } else {
      map.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  }, [map, places, flyToTarget]);

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
            'circle-stroke-color': '#ffffff',
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
            'circle-radius': ['case', ['get', 'selected'], 12, 7],
            'circle-stroke-width': ['case', ['get', 'selected'], 6, 2],
            'circle-stroke-color': '#ffffff',
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

  // Interactions: cluster zoom, saved-place select.
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: MapMouseEvent) => {
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
        const id = String(pointFeatures[0].properties?.id ?? '');
        const place = placesRef.current.find((p) => p.id === id);
        if (place) onSelectPlaceRef.current(place);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map]);

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
    <div className="relative isolate h-full w-full overflow-hidden bg-muted">
      <div ref={containerRef} className="h-full w-full" />

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
