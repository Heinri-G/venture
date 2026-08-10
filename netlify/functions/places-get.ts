import { Handler } from '@netlify/functions';

const PLACES_API_BASE = 'https://places-api.foursquare.com';
const PLACES_API_VERSION = '2025-06-17';

interface PlaceDetails {
  fsq_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  phone?: string;
  website?: string;
  hours?: string;
  photoUrl?: string;
  rating?: number;
  description?: string;
}

function getFsqId(event: { body: string | null; queryStringParameters: Record<string, string | undefined> | null }): string | null {
  if (event.body) {
    try {
      const body = JSON.parse(event.body) as { fsq_id?: string; id?: string };
      if (typeof body?.fsq_id === 'string') return body.fsq_id;
      if (typeof body?.id === 'string') return body.id;
    } catch {
      // fall through to query params
    }
  }
  const id = event.queryStringParameters?.fsq_id || event.queryStringParameters?.id;
  return id || null;
}

function getDemoDetails(fsqId: string): PlaceDetails {
  return {
    fsq_id: fsqId,
    name: 'Sample Place',
    address: '123 Explorer Way',
    latitude: 48.8584,
    longitude: 2.2945,
    category: 'Point of Interest',
    phone: '+33 1 42 00 00 00',
    website: 'https://example.com',
    hours: '9:00 AM – 6:00 PM',
    photoUrl: '',
    rating: 8.5,
    description: 'A wonderful place to explore.',
  };
}

export const handler: Handler = async (event) => {
  const fsqId = getFsqId(event);

  if (!fsqId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing fsq_id parameter' }),
    };
  }

  const apiKey = process.env.FOURSQUARE_API_KEY;

  // Demo fallback so the UI is usable in local dev without an API key.
  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify(getDemoDetails(fsqId)),
    };
  }

  try {
    const url = new URL(`${PLACES_API_BASE}/places/${encodeURIComponent(fsqId)}`);
    // Only request fields available on the free tier; premium fields
    // (photos, hours, rating, description) require paid API credits.
    url.searchParams.set(
      'fields',
      'fsq_place_id,name,latitude,longitude,categories,location,website,tel'
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
        body: JSON.stringify({ error: res.statusText || 'Place not found' }),
      };
    }

    const data = await res.json();

    const details: PlaceDetails = {
      fsq_id: data.fsq_place_id || fsqId,
      name: data.name || 'Unknown place',
      address:
        data.location?.formatted_address ||
        data.location?.address ||
        'Address unavailable',
      latitude: data.latitude ?? 0,
      longitude: data.longitude ?? 0,
      category: data.categories?.[0]?.name || 'Venue',
      phone: data.tel || undefined,
      website: data.website || undefined,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(details),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};
