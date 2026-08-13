# Skill: mapbox-integration

# MapLibre GL JS + Protomaps Integration Skill

When building maps in this Vite + React project, follow these guidelines. This project uses **MapLibre GL JS** (`maplibre-gl`, API-compatible with mapbox-gl) rendering **Protomaps** vector tiles. Routing is provided by the OSRM public demo API with a straight-polyline fallback.

## Setup
1. Use the `maplibre-gl` package. Do NOT use Leaflet.
2. The Protomaps API key should be embedded in the tiles URL stored as `VITE_PROTOMAPS_TILES_URL` in `.env` (exposed to the client via Vite's VITE_ prefix). Do NOT commit `.env`. Create the key at Protomaps and allowlist CORS origins (`http://localhost:8888`, prod Netlify URL).
3. Do NOT hand-build styles — use `createProtomapsStyle(theme)` from `src/lib/map/protomaps.ts` (wraps `@protomaps/basemaps` `layers()`/`namedFlavor()`, light/dark theme-aware).
4. Do NOT create maps manually — use the `useMapLibre()` hook from `src/hooks/useMapLibre.ts`. It creates the map once (guards React 18 StrictMode double-effects), disposes on unmount, and re-applies the basemap style on theme flips.

## Basic React Component Example
```tsx
import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapLibre } from '@/hooks/useMapLibre';

export default function Map() {
  const { containerRef, map } = useMapLibre({ center: [13.405, 52.52], zoom: 12 });

  useEffect(() => {
    if (!map) return;
    // Add sources/layers once the style has loaded:
    //   if (!map.getSource('my-source')) { map.addSource(...); map.addLayer(...); }
    // Or wait: if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [map]);

  return <div ref={containerRef} className="h-full w-full" />;
}
```

## Clustering + markers
- Use one GeoJSON source with `cluster: true, clusterRadius` plus circle/symbol layers (cluster circle, cluster-count symbol, unclustered-point circle). Update data via `(map.getSource(id) as maplibregl.GeoJSONSource).setData(fc)`.
- Intercept clicks with `map.queryRenderedFeatures(e.point, { layers: [...] })` inside a single `map.on('click', handler)`; zoom into clusters via `source.getClusterExpansionZoom(clusterId)` (returns a Promise in maplibre-gl v6).
- For custom icons (numbered route stops, saved-place dots) use `new maplibregl.Marker({ element })` HTML markers (Tailwind classes; selection ring via `ring-4 ring-primary/30`).

## Routing
- Use `fetchRoute(waypoints: [number, number][])` from `src/lib/routing.ts` (OSRM, geometries=geojson). It is a dev-only demo backend — always fall back to a straight polyline on error and show a loading state while fetching.

## Notes
- **CSS is Required**: Ensure `maplibre-gl/dist/maplibre-gl.css` is imported (already done globally in `src/main.tsx`), otherwise the map will not render correctly.
- **Style reloads**: `map.setStyle()` (theme flip) removes all sources/layers. Re-add custom layers via the `map.on('style.load', ...)` listener.
- **Mobile First**: Since this is a mobile-first app, ensure any map controls (zoom, compass) are appropriately sized for touch targets.
- Basemap attribution is included via `createProtomapsStyle` (`© OpenStreetMap contributors · Protomaps`).
