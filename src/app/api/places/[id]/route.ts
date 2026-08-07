export async function GET(request: Request, context: { params?: { id?: string } } ) {
  // Try to read id from context.params (Next style) or from the URL
  const url = new URL(request.url);
  const id = context?.params?.id || url.pathname.split('/').pop();
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({
      fsq_id: id,
      name: 'Sample Place',
      location: { formatted_address: '123 Explorer Way' },
      geocodes: { main: { latitude: 48.8584, longitude: 2.2945 } },
      categories: [{ name: 'Point of Interest' }],
      rating: 8.5,
      description: 'A wonderful place to explore.'
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const res = await fetch(
      `https://api.foursquare.com/v3/places/${id}?fields=fsq_id,name,location,geocodes,categories,photos,rating,hours,description,website,tel`,
      {
        headers: {
          accept: 'application/json',
          Authorization: apiKey,
        }
      }
    );

    if (!res.ok) {
      throw new Error(`Foursquare API error: ${res.statusText}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Error fetching Foursquare place details:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch place details' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
