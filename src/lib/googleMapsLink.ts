export interface ResolvedMapsPlace {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  mapsUrl: string | null;
  /** True when the link was missing a name or coordinates and needs review. */
  needsReview: boolean;
}

const MAPS_URL_RE =
  /https?:\/\/(?:www\.)?(?:maps\.google\.[a-z.]+|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)\/[^\s'"<>]+/i;

const COORD_RE = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;

/** Pulls the first Google Maps URL out of a block of shared text. */
export function extractMapsUrl(text: string): string | null {
  const match = text.match(MAPS_URL_RE);
  if (!match) return null;
  return match[0].replace(/[),;]+$/, '');
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** True when the URL is a goo.gl / maps.app.goo.gl short link. */
export function isShortMapsUrl(url: string): boolean {
  const host = hostname(url);
  return !!host && /(^|\.)goo\.gl$/i.test(host);
}

function firstLineName(text: string, url: string): string | null {
  const withoutUrl = text.replace(url, '');
  const line = withoutUrl
    .split(/\r?\n/)
    .map((l) => l.trim())
    .map((l) => l.replace(/^[-•·]\s*/, ''))
    .find((l) => l.length > 0);
  if (!line || line.length > 120) return null;
  return line.replace(/^["']|["']$/g, '').trim() || null;
}

interface ParsedParts {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
}

/** Parses a (fully expanded) Google Maps URL into usable place data. */
export function parseMapsUrl(rawUrl: string): ParsedParts {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {};
  }

  const pathname = url.pathname;
  const search = url.searchParams;
  const queryParam = search.get('q') ?? search.get('query') ?? search.get('ll') ?? search.get('center');
  const text = decodeSafe(queryParam ?? '');

  const parts: ParsedParts = {};

  // Coordinates: `@lat,lng` (path), `!3dLat!4dLng` (blob), or `q=lat,lng`.
  const atMatch = pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    parts.latitude = Number(atMatch[1]);
    parts.longitude = Number(atMatch[2]);
  }
  const d3d4dMatch = (pathname + url.search).match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d3d4dMatch && parts.latitude == null) {
    parts.latitude = Number(d3d4dMatch[1]);
    parts.longitude = Number(d3d4dMatch[2]);
  }
  if (parts.latitude == null && queryParam) {
    const bareQuery = text.replace(/\([^)]*\)$/, '');
    const coord = bareQuery.match(COORD_RE);
    if (coord) {
      parts.latitude = Number(coord[1]);
      parts.longitude = Number(coord[2]);
    }
  }

  // Google place id: `ftid=`, `cid=` (decimal) or the `!1s0x…:0x…` blob.
  const ftid = search.get('ftid');
  if (ftid) {
    parts.googlePlaceId = ftid;
  }
  const cid = search.get('cid');
  if (!parts.googlePlaceId && cid && /^\d+$/.test(cid)) {
    parts.googlePlaceId = `0x${Number(cid).toString(16)}`;
  }
  if (!parts.googlePlaceId) {
    const blobMatch = (pathname + url.search).match(/!1s(0x[a-f0-9]+:[a-f0-9]+)/i);
    if (blobMatch) {
      parts.googlePlaceId = blobMatch[1];
    }
  }

  // Name: `/maps/place/<Name>/@` path segment, or `?q=<query>`.
  const placeMatch = pathname.match(/\/maps\/place\/([^/]+)/i);
  if (placeMatch) {
    const segment = decodeSafe(placeMatch[1]);
    parts.name = segment.replace(/\+/g, ' ').replace(/_/g, ' ').replace(/-+$/g, '').trim();
  }
  if (!parts.name && queryParam && !COORD_RE.test(bareQueryOr(queryParam))) {
    const candidate = text.replace(/\([^)]*\)$/, '').trim();
    if (candidate) parts.name = candidate;
  }

  return parts;
}

function bareQueryOr(value: string): string {
  const v = decodeSafe(value);
  return v.replace(/\([^)]*\)$/, '').trim();
}

/**
 * Resolves shared Google Maps text into a place. Short links are expanded
 * server-side (goo.gl redirects), long links parse in the browser.
 */
export async function resolveGoogleMapsShare(
  text: string
): Promise<{ data?: ResolvedMapsPlace; error?: string }> {
  const url = extractMapsUrl(text);
  if (!url) {
    return { error: 'No Google Maps link found in that text.' };
  }

  let mapsUrl = url;
  try {
    const response = await fetch('/.netlify/functions/google-maps-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      const json = (await response.json()) as { mapsUrl?: string };
      if (typeof json.mapsUrl === 'string' && json.mapsUrl) {
        mapsUrl = json.mapsUrl;
      }
    }
  } catch {
    // Function unavailable (e.g. plain `vite dev`) — parse the raw link.
  }

  const parsed = parseMapsUrl(mapsUrl);
  const name = parsed.name || firstLineName(text, url);
  const hasCoords = parsed.latitude != null && parsed.longitude != null;

  return {
    data: {
      name: name ?? null,
      address: parsed.address ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      googlePlaceId: parsed.googlePlaceId ?? null,
      mapsUrl,
      needsReview: !hasCoords || !name,
    },
  };
}
