# Places Redirection Plan

Direction change for how places are found and added to Venture. Stop trying to recreate a
Google-Maps-like discovery experience with free providers. Instead:

1. Remove Foursquare; search only the user's saved places.
2. Keep the map as an explorer for saved items.
3. Add "Share from Google Maps" as the primary way to add places, resolving the link to
   name + lat/lng + Google place id, with a rich (lucide) icon picked by the user instead of photos.
4. Keep a manual add fallback (drop a pin / enter coordinates).

Decisions confirmed with the user:

- Share reception: PWA Web Share Target (Android) + universal paste-link fallback.
- Icon library: curated lucide set (already installed, consistent with shadcn/ui), stored as an
  icon key string on `places`.
- Manual add: keep it (pin drop / coordinates).

## 1. Data model — migration `0009_provider_neutral_places.sql`

- Add `provider TEXT`, `provider_place_id TEXT`, `icon TEXT` to `places`.
- Backfill existing rows: `provider = 'foursquare'`, `provider_place_id = foursquare_fsq_id`.
- Add partial unique index on `(provider, provider_place_id)` (where provider not null) — the new
  get-or-create key, replacing the `foursquare_fsq_id` unique.
- Drop `foursquare_fsq_id` + `idx_places_foursquare` after backfill (code updated in the same pass).
- Keep `photo_url` column for legacy rows but stop rendering it in the UI.
- `places` RLS/grants stay as-is (public adventures still need anon SELECT on `places`).

## 2. Remove Foursquare everywhere

- Delete `netlify/functions/places-search.ts` and `places-get.ts`; remove `FOURSQUARE_API_KEY`
  from `.env.example`.
- Delete `src/lib/places.ts`; remove the foursquare-api skill.
- `Home.tsx`: drop `useShowcasePlaces` + the "Live · Foursquare" `PlacesRail` (replace with a
  static/illustrative rail or remove the section entirely).

## 3. Search = saved places only

- New `searchSavedPlaces(userId, query)` in `src/lib/savedPlaces.ts` using Supabase `.ilike()` on
  joined `name`/`address`/`category` (debounced, server-side, no Foursquare).
- Rewrite `PlacesSearch.tsx` to search the current user's saved places (keeps
  debounce/keyboard/combobox UX). Selecting a result flies the map to it and opens the saved-place
  sheet.
- Empty state: "No saved places match — add one by sharing from Google Maps" + Add button.

## 4. Map = saved-places explorer (fixes privacy leak)

- `MapView.tsx`: remove the public `.limit(500)` fetch and demo markers. Load only the signed-in
  user's saved places as markers.
- Keep clustering; render markers as colored circles with the place's lucide icon (HTML `Marker`
  elements, like `AdventureMap` already does).
- Click marker → saved-place sheet (icon header, notes/rating, View on map, Open in Google Maps,
  Share).
- Add a floating "+" button → `AddPlaceSheet`.
- Make `/map` a `ProtectedRoute` in `App.tsx` (currently open to logged-out visitors, which is what
  exposed all places).

## 5. "Share from Google Maps" → Add place

- Parser `src/lib/googleMapsLink.ts`: extracts the maps URL from shared text, expands
  `maps.app.goo.gl` short links, and pulls out name (from text line / URL slug), `@lat,lng`
  (or `?q=`, `!3d/!4d`), address if present, and Google place ID from `ftid=`, `cid=` (hex→dec),
  or `!1s0x…:0x…`. Returns `{ name, address?, latitude, longitude, googlePlaceId? }` — no Google
  API keys needed.
- Netlify function `google-maps-resolve` (no secrets): POST `{ text }` → normalized payload.
  Handles redirect expansion server-side so the browser never hits redirect/CORS edge cases.
  (This replaces the two Foursquare functions.)
- `AddPlaceSheet.tsx` — the new add flow:
  - Prefilled from a resolved share, or empty for manual entry.
  - Fields: name (required), address (optional), lat/lng (editable; "use map pin" option), icon
    picker, auto-suggested category from the chosen icon.
  - Save → `getOrCreatePlace({ provider: 'google'|'manual', provider_place_id: googlePlaceId?, ... })`
    + `upsertSavedPlace`.
  - Duplicate detection: if the Google place ID already exists, show "Already saved — open it"
    instead of duplicating.

## 6. PWA scaffolding (share target + paste fallback)

- `index.html`: link `manifest.json`.
- Add a minimal service worker (registered in `main.tsx`) so the app is installable — this is what
  lets Android Chrome list Venture in the share sheet. Generate the missing `/icons/icon-192.png`
  + `512` assets (public/icons doesn't exist yet; manifest currently references nothing).
- Add `share_target` to `manifest.json` (GET, `action: "/share"`, `text` param) + a Netlify SPA
  redirect for `/share`.
- New `/share` route: reads `?text=`, runs `google-maps-resolve`, and opens `AddPlaceSheet`
  prefilled.
- Paste fallback (iOS/desktop, and anyone not installing): `AddPlaceSheet` has a "Paste Google Maps
  link" field running the same parser.
- Manual add: a "drop pin on map" mode in `AddPlaceSheet` (pick point → coords) and/or manual
  coords entry.

## 7. Icons replace photos across UI

- `src/lib/placeIcons.ts`: curated lucide icon map keyed by stored `icon` string (coffee, food,
  drinks, shopping, culture, outdoors, transit, accommodation, nightlife, activity, default) →
  lucide component. `IconPicker.tsx` renders the grouped grid.
- Replace `photo_url` image blocks with icon badges in: `MapView` popup, `SavedPlacesList`,
  `PlaceSelector`, `SavedPlaceDetails`, and the new `AddPlaceSheet` header.
- `PlaceDetails.tsx` (the Foursquare search-result sheet) is removed; the saved-place sheet becomes
  the only details surface. Phone/website/hours enrichment goes away (those came from Foursquare) —
  keep the "Open in Google Maps" link-out instead.

## 8. Docs, config & skills cleanup

- Update `tech_stack.md`, `security.md`, `PRODUCT.md`, `.env.example`.
- Update `supabase-client` skill example (keyed on `(provider, provider_place_id)`); delete
  foursquare-api skill; add a google-maps-share skill.
- Remove now-dead references in `artifacts/` where cheap; drop `VITE_OVERTURE_RELEASE` from
  `.env.example` (hybrid plan abandoned).

## 9. Verification

- `npm run lint`, `npx tsc --noEmit`, `npm run build`, then `npm run netlify:dev`.
- E2E (test account): `/map` shows only the user's saved places; search filters saved places; paste
  a Google Maps link → prefilled AddPlaceSheet → icon picker → save; duplicate share dedupes;
  legacy Foursquare places render with a default icon; adventures still work; `/map` redirects
  logged-out users to `/login`.

## Notes / assumptions

- No Google API usage: we parse share URLs and link out to Google Maps — no key, no Google Places
  API, no ToS risk.
- Legacy Foursquare-sourced saved places keep working (backfilled to `provider='foursquare'`,
  default icon).
- The share-sheet experience on Android requires the user to install the PWA (add to home screen);
  the paste flow covers everything else.

## Open micro-decisions

- Default icon when a legacy place has no `icon`.
- Whether `photo_url` should be fully dropped in a later migration.
