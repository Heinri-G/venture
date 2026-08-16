# Tech Stack Rules: Venture

1. **Framework**: React 18 + Vite (TypeScript, strict mode). The frontend is built with Vite and hosted on Netlify.
2. **Routing**: Use `react-router-dom` for client-side routing. No Next.js App Router or API routes.
3. **UI**: Use Tailwind CSS for styling plus shadcn/ui components (built on Radix UI primitives) for all UI. Follow the shadcn/ui design guidelines in `design_guidelines.md`.
4. **Backend**: Use Supabase for database, authentication, and storage. Do not use custom backend routes unless necessary for server-side logic.
5. **Serverless**: Use Netlify Functions under `netlify/functions/` for any server-side logic (e.g. expanding Google Maps short links in `google-maps-resolve.ts`).
6. **Maps**: Use MapLibre GL JS (`maplibre-gl`) with Protomaps vector tiles via `@protomaps/basemaps` style layers. The Protomaps API key lives in `VITE_PROTOMAPS_TILES_URL` (see `.env.example`); map style is built in `src/lib/map/protomaps.ts`. Routing uses the OSRM public demo API (`src/lib/routing.ts`, dev-only with a straight-polyline fallback).
7. **Places Data**: Places are saved by the user from Google Maps share links (`src/lib/googleMapsLink.ts`, no API key) or added manually. The map shows only the user's saved places; there is no public place search.
