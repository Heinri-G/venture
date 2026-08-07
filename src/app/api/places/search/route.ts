import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const category = searchParams.get('category');

  if (!query && !category) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    // Demo/Fallback response if key is missing during testing
    return NextResponse.json({
      results: [
        {
          fsq_id: 'demo-1',
          name: 'Eiffel Tower',
          location: { address: 'Champ de Mars, 5 Av. Anatole France', formatted_address: '75007 Paris, France' },
          geocodes: { main: { latitude: 48.8584, longitude: 2.2945 } },
          categories: [{ name: 'Landmark', icon: { prefix: 'https://ss3.4sqi.net/img/categories_v2/building/government_monument_', suffix: '.png' } }]
        },
        {
          fsq_id: 'demo-2',
          name: 'Louvre Museum',
          location: { address: 'Rue de Rivoli', formatted_address: '75001 Paris, France' },
          geocodes: { main: { latitude: 48.8606, longitude: 2.3376 } },
          categories: [{ name: 'Art Museum', icon: { prefix: 'https://ss3.4sqi.net/img/categories_v2/arts_entertainment/museum_art_', suffix: '.png' } }]
        }
      ]
    });
  }

  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (lat && lng) params.append('ll', `${lat},${lng}`);
    if (category) params.append('categories', category);
    params.append('limit', '15');
    params.append('fields', 'fsq_id,name,location,geocodes,categories,photos,rating,hours,description');

    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params.toString()}`, {
      headers: {
        accept: 'application/json',
        Authorization: apiKey,
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!res.ok) {
      throw new Error(`Foursquare API error: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Foursquare places:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch places' }, { status: 500 });
  }
}
