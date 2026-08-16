# Hybrid Places Implementation

Implement a provider-neutral places system for Venture.

## Goals

- Browse nearby places directly on the MapLibre map.
- Select and save Overture places without downloading the global dataset.
- Keep Foursquare for explicit text search and optional details.
- Avoid Google Places and uncontrolled API usage.
- Do not implement photo support in this task.

## Data Sources

### Overture

Use the official monthly `places.pmtiles` file through HTTP range requests:

`https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/<release>/places.pmtiles`

Do not download or import the full global dataset. Use the existing `pmtiles` dependency and register the PMTiles protocol with MapLibre.

Render Overture place features at appropriate zoom levels. Query rendered features when the user clicks a place and display a selectable place-details sheet.

### Foursquare

Keep the existing Netlify Functions and browser contract:

- `/.netlify/functions/places-search`
- `/.netlify/functions/places-get`

Use Foursquare only for explicit search interactions. Never call it automatically on map movement or viewport changes.

## Database

Add a migration making canonical places provider-neutral:

- `provider`
- `provider_place_id`
- Existing place fields
- Unique `(provider, provider_place_id)`

Preserve existing Foursquare records and saved places. Do not store Overture IDs in `foursquare_fsq_id`.

Update `src/lib/savedPlaces.ts` and affected components to support both providers.

## Requirements

- Overture places can be selected and saved.
- Foursquare search continues working.
- Saved places and adventures work with either provider.
- Existing saved Foursquare places remain intact.
- Map browsing does not generate Foursquare API requests.
- Add Overture and Foursquare attribution where required.
- Keep API keys server-side.
- Add request deduplication, debounce, and stale-request cancellation to Foursquare search.
- Do not add photo fetching, photo storage, or photo UI.

## Verification

Run:

- `npm run lint`
- `npm run build`
- `npm run netlify:dev`

Verify manually that:

1. Overture places appear while browsing the map.
2. Clicking an Overture place opens details.
3. An Overture place can be saved once without duplicates.
4. Foursquare text search still works.
5. Existing saved Foursquare places and adventures still render.
6. Map panning does not call Foursquare.
