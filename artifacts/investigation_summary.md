# Investigation Summary: Venture (Wanderlust Companion)

## Overview
This document summarizes the silent investigation of the Venture codebase and consolidates the architectural direction for the upcoming implementation. It is the context source for `artifacts/investigation_summary_plan.md` and the modular task files in `artifacts/`. For the authoritative project state, see `HANDOVER.md`, `AGENT_HANDOVER.md`, and `artifacts/findings_summary.md`.

## Current State
* The project has been migrated from Next.js to **React + Vite (TypeScript)** with **Netlify Functions** for serverless backend logic.
* Build is validated: `npm run build` succeeds; dev server runs on port `5173`.
* **Supabase** is the backend for Database, Auth, and Storage. Client env vars use the Vite standard (`import.meta.env.VITE_*`).
* Browser client: `src/lib/supabase/client.ts` (anon key). Server/functions client: `src/lib/supabase/server.ts` (service-role key, never exposed to the browser).
* Database schema lives in `supabase/schema.sql` (profiles, places, saved_places, adventures, adventure_places, friends, groups, group_members, adventure_shares) with RLS enabled.

## Maps Decision (Important)
The app uses **Leaflet + OpenStreetMap** — NOT Mapbox.
* Leaflet is free and open-source and requires **no API token**, unlike Mapbox GL JS.
* Dependencies already installed: `leaflet`, `react-leaflet`, `react-leaflet-cluster`, `@types/leaflet`.
* Baseline map component: `src/components/MapView.tsx` (react-leaflet with OSM tile layer, clustering, and a Supabase-backed marker source with a demo fallback).
* No map API key should be defined. Stale `*_MAPBOX_ACCESS_TOKEN` references must be removed from docs and `.env.example`.

## Places Data
* **Foursquare Places API** provides place search/autocomplete and details, proxied through Netlify Functions (`netlify/functions/`) so the `FOURSQUARE_API_KEY` never reaches the client.
* Places are synced into the `public.places` table; user saves go into `public.saved_places` (with notes/rating).

## Architecture Principles
1. Keep the frontend lean; proxy external APIs and privileged DB actions through Netlify Functions.
2. RLS enabled on all tables; clients query via the browser Supabase client under RLS.
3. Mobile-first UI using Tailwind CSS responsive breakpoints.
4. No framework-specific helpers (`next/image`, etc.) — plain HTML/CSS and lightweight components.

## Environment Variables
```
# Client (Vite-prefixed)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Server-side only (Netlify Functions)
SUPABASE_SERVICE_ROLE_KEY=
FOURSQUARE_API_KEY=

# Maps: none required (Leaflet + OpenStreetMap is tokenless)
```

## Planned Work (see investigation_summary_plan.md)
The next steps are decomposed into 8 modular, self-contained task files in `artifacts/`:
1. `task_1_user_profile.md` — profile page & Supabase binding.
2. `task_2_leaflet_map_integration.md` — full-screen Leaflet + OpenStreetMap map.
3. `task_3_foursquare_search.md` — Foursquare autocomplete via Netlify proxy.
4. `task_4_place_details_save.md` — place details UI & save to `saved_places`.
5. `task_5_saved_places_list.md` — saved places list/map views with pagination/filtering.
6. `task_6_adventures_management.md` — adventures, ordering, and place linking.
7. `task_7_adventure_sharing_collaboration.md` — visibility, public links, collaboration.
8. `task_8_social_friends_groups.md` — friends, groups, and collaborative editing.
