---
name: foursquare-api
description: Reference for using the Foursquare Places API to search for locations and retrieve details via Netlify Functions (Vite + React frontend).
---

# Foursquare Places API Skill

When fetching place data, use the Foursquare Places API.

## Authentication
- API Key must be stored in `.env` during development and configured in the Netlify UI for production as `FOURSQUARE_API_KEY`. Do NOT commit `.env`.
- Include the key in the `Authorization` header for all requests.

## Key Endpoints
### 1. Place Search / Autocomplete
Use this to build the search bar where users look for places to save.
- **Endpoint**: `https://places-api.foursquare.com/places/search` (new Places API) or `https://api.foursquare.com/v3/places/search` (legacy v3, deprecated May 15 2026)
- **Headers**:
```json
{
  "accept": "application/json",
  "Authorization": "YOUR_FOURSQUARE_API_KEY"
}
```
- **Location params are optional**:
  - `ll` (lat,lng) is optional. Passing it anchors and prioritizes nearby results. Omit it to fall back to a global/IP-biased search — do **not** inject hardcoded coordinates as defaults.
  - Do **not** send `radius` unless explicitly requested: `radius` omits global search results.
  - Other location options: `near` (geocodable locality), `ne`/`sw` (bounding box).

### 2. Place Details
Use this when a user taps on a place to view more info (photos, ratings, hours) before saving it.
- **Endpoint**: `https://api.foursquare.com/v3/places/{fsq_id}`
- **Query Params**: Use the `fields` parameter to limit the response and save costs. Common fields: `fsq_id,name,location,categories,photos,rating,hours`.

## Best Practices
- **Security**: Always proxy Foursquare requests through Netlify Functions to keep the `FOURSQUARE_API_KEY` secure. **Do not** fetch directly from the client component.
- **Caching**: Cache responses where appropriate to reduce API calls and stay well within the free tier limits.
