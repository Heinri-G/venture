import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { AttributionControl, Map, setWorkerUrl } from 'maplibre-gl';
import { createProtomapsStyle, type MapTheme } from '../lib/map/protomaps';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// maplibre-gl v6 derives its tile-parsing worker URL from its own module URL
// (./maplibre-gl-worker.mjs). Vite's dep optimizer only pre-bundles the main
// entry, so that derived URL resolves to the SPA fallback (index.html) in dev
// and to a missing file in the production build, silently killing the worker.
// Import the worker through Vite (bundles its maplibre-gl-shared import) and
// point maplibre at the resulting URL.
setWorkerUrl(maplibreWorkerUrl);

const DEFAULT_CENTER: [number, number] = [13.405, 52.52]; // Berlin fallback

function cachedUserCenter(): [number, number] | null {
  try {
    const raw = localStorage.getItem('venture:user-location');
    if (!raw) return null;
    const { latitude: lat, longitude: lng } = JSON.parse(raw);
    if (typeof lat === 'number' && typeof lng === 'number') return [lng, lat];
  } catch { /* ignore */ }
  return null;
}

interface UseMapLibreOptions {
  center?: [number, number];
  zoom?: number;
}

// Creates a MapLibre GL map once (guarding against React 18 StrictMode's
// double-effect) and re-applies the Protomaps basemap style on theme flips.
export function useMapLibre(options?: UseMapLibreOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [map, setMap] = useState<Map | null>(null);

  const { resolvedTheme } = useTheme();
  const theme: MapTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const optionsRef = useRef(options);
  const themeRef = useRef<MapTheme>(theme);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const instance = new Map({
      container,
      style: createProtomapsStyle(themeRef.current),
      center: optionsRef.current?.center ?? cachedUserCenter() ?? DEFAULT_CENTER,
      zoom: optionsRef.current?.zoom ?? 12,
      attributionControl: false,
    });

    const attribution = new AttributionControl({ compact: true });
    instance.addControl(attribution);

    // Expand attribution so it's visible on load per OSM guidelines.
    const attrEl = container.querySelector('.maplibregl-ctrl-attribution');
    if (attrEl) attrEl.removeAttribute('collapsed');

    // Collapse on any map interaction.
    const collapseOnInteraction = () => {
      attrEl?.setAttribute('collapsed', '');
    };
    instance.on('movestart', collapseOnInteraction);

    mapRef.current = instance;
    setMap(instance);

    return () => {
      instance.off('movestart', collapseOnInteraction);
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  // Re-apply the basemap style when the theme flips. setStyle() is safe to call
  // while the previous style is still loading — MapLibre aborts and rebuilds it.
  useEffect(() => {
    if (!map) return;
    const currentTheme = (map.getStyle()?.metadata as Record<string, unknown> | undefined)?.[
      'venture:theme'
    ];
    if (currentTheme === theme) return;
    map.setStyle(createProtomapsStyle(theme));
  }, [map, theme]);

  return { containerRef, map, mapRef };
}
