export interface PlaceSuggestion {
  fsq_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
}

export interface PlaceResult {
  fsq_id?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  phone?: string;
  website?: string;
  hours?: string;
  photoUrl?: string;
  rating?: number;
  description?: string;
}

export interface SearchPlacesOptions {
  latitude?: number;
  longitude?: number;
  limit?: number;
  category?: string;
}

export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {}
): Promise<PlaceSuggestion[]> {
  const response = await fetch('/.netlify/functions/places-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...options }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Search failed');
  }
  return data.results || [];
}

export async function getPlaceDetails(fsqId: string): Promise<PlaceResult> {
  const response = await fetch('/.netlify/functions/places-get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fsq_id: fsqId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not load place details');
  }
  return data;
}
