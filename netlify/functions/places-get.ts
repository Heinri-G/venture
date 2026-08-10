import { Handler } from '@netlify/functions';

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

function getFsqId(event: { body: string | null; queryStringParameters: Record<string, string> | null }): string | null {
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

function toPhotoUrl(prefix: string | undefined, suffix: string | undefined): string | undefined {
  if (!prefix || !suffix) return undefined;
  return `${prefix}original${suffix}`;
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
    const url = new URL(`https://api.foursquare.com/v3/places/${encodeURIComponent(fsqId)}`);
    url.searchParams.set(
      'fields',
      'fsq_id,name,location,geocodes,categories,photos,rating,hours,description,website,tel'
    );

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json', Authorization: apiKey },
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: res.statusText || 'Place not found' }),
      };
    }

    const data = await res.json();

    const details: PlaceDetails = {
      fsq_id: data.fsq_id || fsqId,
      name: data.name || 'Unknown place',
      address:
        data.location?.formatted_address ||
        data.location?.address ||
        'Address unavailable',
      latitude: data.geocodes?.main?.latitude ?? 0,
      longitude: data.geocodes?.main?.longitude ?? 0,
      category: data.categories?.[0]?.name || 'Venue',
      phone: data.tel || undefined,
      website: data.website || undefined,
      hours: data.hours?.display || undefined,
      photoUrl: toPhotoUrl(data.photos?.[0]?.prefix, data.photos?.[0]?.suffix),
      rating: data.rating,
      description: data.description || undefined,
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
