import { layers, namedFlavor } from '@protomaps/basemaps';
import type { StyleSpecification } from 'maplibre-gl';

const PROTOMAPS_TILES_URL =
  (import.meta.env.VITE_PROTOMAPS_TILES_URL as string | undefined) ??
  'https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=<key>';

export type MapTheme = 'light' | 'dark';

export function createProtomapsStyle(theme: MapTheme): StyleSpecification {
  const flavor = namedFlavor(theme === 'dark' ? 'dark' : 'light');
  return {
    version: 8,
    metadata: { 'venture:theme': theme },
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [PROTOMAPS_TILES_URL],
        attribution: '© OpenStreetMap contributors · Protomaps',
      },
    },
    layers: layers('protomaps', flavor, { lang: 'en' }),
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`,
  };
}
