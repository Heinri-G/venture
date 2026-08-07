import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const params = event.queryStringParameters || {};
  const query = params.query;
  const lat = params.lat;
  const lng = params.lng;
  const category = params.category;
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        results: [
          {
            fsq_id: 'demo-1',
            name: 'Eiffel Tower',
            location: { address: 'Champ de Mars, 5 Av. Anatole France', formatted_address: '75007 Paris, France' },
            geocodes: { main: { latitude: 48.8584, longitude: 2.2945 } },
            categories: [{ name: 'Landmark', icon: { prefix: 'https://ss3.4sqi.net/img/categories_v2/building/government_monument_', suffix: '.png' } }]
          }
        ]
      })
    }
  }

  try {
    const url = new URL('https://api.foursquare.com/v3/places/search');
    if (query) url.searchParams.set('query', query);
    if (lat && lng) url.searchParams.set('ll', `${lat},${lng}`);
    if (category) url.searchParams.set('categories', category);

    const res = await fetch(url.toString(), { headers: { accept: 'application/json', Authorization: apiKey } });
    if (!res.ok) return { statusCode: res.status, body: JSON.stringify({ error: res.statusText }) };
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
