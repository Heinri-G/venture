import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const id = event.queryStringParameters?.id || undefined;
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        fsq_id: id,
        name: 'Sample Place',
        location: { formatted_address: '123 Explorer Way' },
        geocodes: { main: { latitude: 48.8584, longitude: 2.2945 } },
        categories: [{ name: 'Point of Interest' }],
        rating: 8.5,
        description: 'A wonderful place to explore.'
      }),
    };
  }

  try {
    const res = await fetch(
      `https://api.foursquare.com/v3/places/${id}?fields=fsq_id,name,location,geocodes,categories,photos,rating,hours,description,website,tel`,
      {
        headers: { accept: 'application/json', Authorization: apiKey },
      }
    );

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: res.statusText }) };
    }

    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
