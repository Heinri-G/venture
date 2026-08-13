import type { LineString } from 'geojson';

// OSRM public demo server. Dev-only routing backend — do not rely on it in
// production. Callers must fall back to a straight polyline on failure.
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export interface OSRMResponse {
  code?: string;
  routes?: { geometry: LineString }[];
}

export async function fetchRoute(waypoints: [number, number][]): Promise<[number, number][]> {
  if (waypoints.length < 2) return waypoints;
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const res = await fetch(`${OSRM_URL}/${coords}?overview=full&geometries=geojson`);
  if (!res.ok) {
    throw new Error(`Routing failed with status ${res.status}`);
  }
  const json = (await res.json()) as OSRMResponse;
  if (json.code !== 'Ok' || !json.routes?.length) {
    throw new Error(json.code ? `Routing error: ${json.code}` : 'No route returned');
  }
  return json.routes[0].geometry.coordinates as [number, number][];
}
