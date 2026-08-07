import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      fsq_id: id,
      name: 'Sample Place',
      location: { formatted_address: '123 Explorer Way' },
      geocodes: { main: { latitude: 48.8584, longitude: 2.2945 } },
      categories: [{ name: 'Point of Interest' }],
      rating: 8.5,
      description: 'A wonderful place to explore.'
    });
  }

  try {
    const res = await fetch(
      `https://api.foursquare.com/v3/places/${id}?fields=fsq_id,name,location,geocodes,categories,photos,rating,hours,description,website,tel`,
      {
        headers: {
          accept: 'application/json',
          Authorization: apiKey,
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      }
    );

    if (!res.ok) {
      throw new Error(`Foursquare API error: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Foursquare place details:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch place details' }, { status: 500 });
  }
}
