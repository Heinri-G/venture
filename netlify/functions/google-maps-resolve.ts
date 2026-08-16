import type { Handler } from '@netlify/functions';

const MAPS_URL_RE =
  /https?:\/\/(?:www\.)?(?:maps\.google\.[a-z.]+|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)\/[^\s'"<>]+/i;

function extractMapsUrl(text: string): string | null {
  const match = text.match(MAPS_URL_RE);
  if (!match) return null;
  return match[0].replace(/[),;]+$/, '');
}

function isShortUrl(url: string): boolean {
  try {
    return /(^|\.)goo\.gl$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Expands Google Maps short links (goo.gl / maps.app.goo.gl) into their final
 * maps.google.com URL. Short-link redirects can't be followed from the browser
 * (CORS), so this runs server-side. Long links pass through untouched.
 */
export const handler: Handler = async (event) => {
  let text = '';
  try {
    const body = JSON.parse(event.body ?? '{}') as { text?: unknown };
    text = typeof body.text === 'string' ? body.text : '';
  } catch {
    // fall through with empty text
  }

  const url = extractMapsUrl(text);
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No Google Maps link found.' }),
    };
  }

  if (!isShortUrl(url)) {
    return {
      statusCode: 200,
      body: JSON.stringify({ mapsUrl: url }),
    };
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ mapsUrl: response.url || url }),
    };
  } catch {
    // If expansion fails, return the original link; the client still parses it.
    return {
      statusCode: 200,
      body: JSON.stringify({ mapsUrl: url }),
    };
  }
};
