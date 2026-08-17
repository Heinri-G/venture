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

/** Try to find a Google Maps redirect URL embedded in an HTML response body. */
function extractRedirectFromHtml(html: string): string | null {
  // <meta http-equiv="refresh" content="0;url=https://...">
  const metaRefresh = html.match(/content=["']\d+;\s*url=([^"']+)/i);
  if (metaRefresh) return metaRefresh[1];

  // window.location = "https://..." or window.location.href = "https://..."
  const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)/i);
  if (jsRedirect) return jsRedirect[1];

  // location.replace("https://...")
  const locationReplace = html.match(/location\.replace\(\s*["']([^"']+)/i);
  if (locationReplace) return locationReplace[1];

  // <a href="https://..." ...> redirect link — catch any Google Maps or
  // google.com/maps href, not just www.google.com/maps.
  const anchor = html.match(/href=["'](https:\/\/(?:www\.)?google\.[a-z.]+\/maps[^"']+)/i);
  if (anchor) return anchor[1];

  // Last resort: any bare https URL containing /maps/place/ or /maps/dir/
  const mapsUrl = html.match(/(https:\/\/[^"'\s<>]+\/maps\/(?:place|dir|search)[^"'\s<>]+)/i);
  if (mapsUrl) return mapsUrl[1];

  return null;
}

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

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

  // Try expanding the short link with a mobile User-Agent (mimics Google Maps share).
  const userAgents = [MOBILE_UA, 'Mozilla/5.0'];

  for (const ua of userAgents) {
    try {
      const response: Response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': ua },
      });

      // If the URL actually changed, the redirect worked.
      if (response.url && response.url !== url) {
        return {
          statusCode: 200,
          body: JSON.stringify({ mapsUrl: response.url }),
        };
      }

      // The URL didn't change — the server may have returned HTML with an
      // embedded redirect (common for deprecated Dynamic Links).
      // Parse HTML regardless of status code — Google's 404 page for dead
      // Dynamic Links still contains a redirect to the full Maps URL.
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        const redirectUrl = extractRedirectFromHtml(html);
        if (redirectUrl) {
          return {
            statusCode: 200,
            body: JSON.stringify({ mapsUrl: redirectUrl }),
          };
        }
      }
    } catch {
      // Fetch failed — try next user agent.
    }
  }

  // All expansion attempts failed — return the original short URL.
  return {
    statusCode: 200,
    body: JSON.stringify({ mapsUrl: url }),
  };
};
