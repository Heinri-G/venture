import { Handler } from '@netlify/functions';

const PLACES_API_BASE = 'https://places-api.foursquare.com';
const PLACES_API_VERSION = '2025-06-17';

interface SearchSuggestion {
  fsq_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
}

interface SearchRequest {
  query?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
  category?: string;
  radius?: number;
}

function parseRequest(event: { body: string | null; queryStringParameters: Record<string, string | undefined> | null }): SearchRequest {
  if (event.body) {
    try {
      const body = JSON.parse(event.body) as SearchRequest;
      if (typeof body?.query === 'string' || body?.category) return body;
    } catch {
      // fall through to query params
    }
  }
  const params = event.queryStringParameters || {};
  return {
    query: params.query || undefined,
    latitude: params.lat ? Number(params.lat) : params.latitude ? Number(params.latitude) : undefined,
    longitude: params.lng ? Number(params.lng) : params.longitude ? Number(params.longitude) : undefined,
    limit: params.limit ? Number(params.limit) : undefined,
    category: params.category || undefined,
    radius: params.radius ? Number(params.radius) : undefined,
  };
}

function getDemoResults(query: string | undefined, category: string | undefined): SearchSuggestion[] {
  const results: SearchSuggestion[] = [
    {
      fsq_id: 'demo-1',
      name: 'Eiffel Tower',
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
      latitude: 48.8584,
      longitude: 2.2945,
      category: 'Landmark',
    },
    {
      fsq_id: 'demo-2',
      name: 'Louvre Museum',
      address: 'Rue de Rivoli, 75001 Paris, France',
      latitude: 48.8606,
      longitude: 2.3376,
      category: 'Museum',
    },
    {
      fsq_id: 'demo-3',
      name: 'Café de Flore',
      address: '172 Boulevard Saint-Germain, 75006 Paris, France',
      latitude: 48.854,
      longitude: 2.3324,
      category: 'Coffee Shop',
    },
  ];

  if (!query && !category) return results;

  const q = (query || '').toLowerCase();
  const filtered = results.filter((r) => {
    const matchesQuery = !q || r.name.toLowerCase().includes(q);
    const matchesCategory = !category || r.category.toLowerCase().includes(category.toLowerCase());
    return matchesQuery && matchesCategory;
  });

  return filtered.length ? filtered : results.slice(0, 1);
}

export const handler: Handler = async (event) => {
  const { query, latitude, longitude, limit, category, radius } = parseRequest(event);

  if (!query && !category) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing query parameter' }),
    };
  }

  const apiKey = process.env.FOURSQUARE_API_KEY;

  // Demo fallback so the UI is usable in local dev without an API key.
  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ results: getDemoResults(query, category) }),
    };
  }

  try {
    const url = new URL(`${PLACES_API_BASE}/places/search`);
    if (query) url.searchParams.set('query', query);
    // ll is optional. When both coords are valid it anchors/prioritises nearby
    // results; when omitted the API falls back to a global/IP-biased search.
    const hasValidCoords =
      typeof latitude === 'number' &&
      Number.isFinite(latitude) &&
      typeof longitude === 'number' &&
      Number.isFinite(longitude);
    if (hasValidCoords) {
      url.searchParams.set('ll', `${latitude},${longitude}`);
    }
    // radius would omit global results, so it is only sent when explicitly requested.
    if (typeof radius === 'number' && Number.isFinite(radius) && radius >= 0) {
      url.searchParams.set('radius', String(radius));
    }
    if (category) url.searchParams.set('categories', category);
    url.searchParams.set('limit', String(Math.min(Math.max(limit || 10, 1), 10)));
    url.searchParams.set(
      'fields',
      'fsq_place_id,name,latitude,longitude,categories,location'
    );

    const res = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Places-Api-Version': PLACES_API_VERSION,
      },
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: res.statusText || 'Foursquare API error' }),
      };
    }

    const data = await res.json();
    const results: SearchSuggestion[] = (data.results || []).map((place: any) => ({
      fsq_id: place.fsq_place_id,
      name: place.name,
      address:
        place.location?.formatted_address ||
        place.location?.address ||
        'Address unavailable',
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.categories?.[0]?.name || 'Venue',
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};
