# Codebase Analysis & Gap Assessment vs. Implementation Plan

The previous agent left the codebase in a **highly conflicted, "architectural split-personality" state**. It is currently a hybrid of a **Next.js App Router project** and a **Vite Single Page Application (SPA)**. 

Because the underlying project configuration is strictly **Vite + Netlify** (as specified in the `.env`, `package.json`, `netlify.toml`, and `vite.config.ts`), all Next.js directories, Server Actions, and file-system routes are non-functional "dead weight." Even worse, Vite imports referencing these Next.js elements cause build/runtime failures, leaving the app completely broken.

Here is the comprehensive assessment and gap analysis of the current state of the codebase against your **Wanderlust Companion Implementation Plan**.

---

## 1. The Core Issue: Vite vs. Next.js Split-Personality

The project is structured and configured to build and run via **Vite** (`package.json` scripts call `vite` and `vite build`). However, the previous implementation attempt mixed Next.js App Router paradigms directly into a Vite React shell:

1. **Dead Next.js Files (`src/app/`)**: 
   - Files like `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/auth/actions.ts`, and Next.js route handlers under `src/app/api/` exist but are entirely ignored by the Vite build process.
2. **Broken Server Actions (`use server`)**:
   - `src/components/places/PlaceDetailsSheet.tsx` imports `savePlace` from `@/app/actions/places`, which uses Next.js `'use server'` server actions. This cannot compile or execute under Vite.
3. **Mismatched Maps (Leaflet vs. Mapbox)**:
   - The implementation plan mandates **Mapbox GL JS** for styling, customizability, and beautiful map loads.
   - However, the active `src/Home.tsx` renders `src/components/MapView.tsx`, which uses **Leaflet / OpenStreetMap** (not Mapbox). 
   - Meanwhile, there is a separate Mapbox component under `src/components/map/MapView.tsx` which is completely unused and ignored.
4. **Environment Variables**:
   - Client components and functions mix `process.env` (Next.js server-side) with `import.meta.env` (Vite-specific), leading to undefined variables and connection failures when interacting with Supabase or Mapbox.

---

## 2. Feature-by-Feature Gap Analysis

| Feature Area | Specified in Implementation Plan | Current Codebase Implementation Status | Gaps & Conflicted State |
| :--- | :--- | :--- | :--- |
| **Tech Stack & Routing** | Vite + React + Tailwind CSS + Client Routing (`react-router-dom`) | Active app uses standard React Router (`App.tsx` routes), but duplicates page router structure under `src/app`. | **Dead Code**: Next.js App Router files should be completely removed, and client routing should be consolidated entirely in standard React components. |
| **Styling** | Tailwind CSS v4, mobile-first, premium polished layout. | Tailwind is installed, but pages are generic unstyled forms (`src/Login.tsx`, `src/Signup.tsx`) with zero premium feel. | **No Polish**: Layout structures are basic boilerplate with unstyled components, failing the premium mobile-first look. |
| **Authentication** | Supabase Auth (Sign Up, Sign In, Profile management). | Split into `src/Login.tsx` (uses client-side Supabase auth) and `src/app/login/page.tsx` (uses Next.js Server Actions). | **Functional Conflict**: Auth works in Vite but needs to be styled and redirected properly using the browser-based client API, skipping the dead Next.js Server Actions entirely. |
| **Interactive Map** | Mobile-first Mapbox GL JS map. | `src/components/MapView.tsx` uses OpenStreetMap / Leaflet, while `src/components/map/MapView.tsx` is an orphaned Mapbox component. | **Broken Map**: Switch the main page to use the orphaned Mapbox component, supply the Mapbox access token securely, and configure its responsive full-screen mobile height. |
| **Places Search & Autocomplete**| Search bar powered by Foursquare Places API, proxied securely via Netlify Functions. | `netlify/functions/places-search.ts` handles the Foursquare proxy. `src/components/search/SearchBar.tsx` performs query searching. | **Partially Implemented**: The proxy exists and is close to correct, but the front-end components are broken because of environment variable references and Next.js imports. |
| **Saving Places** | Save places to Supabase with rating and notes via RLS-secured tables. | `src/components/places/PlaceDetailsSheet.tsx` is implemented but broken because it attempts to use Next.js Server Actions to write to Supabase. | **Broken Connection**: Rewrite the saving mechanism to use the Vite client-side `supabase` instance directly (which fully honors Row-Level Security in Postgres). |
| **Adventures & Collaboration**| Create groups, friends list, and package saved places into shareable custom adventures. | The tables exist in `supabase/schema.sql`, but there are absolutely **no** front-end views, components, or UI elements built for this. | **Entirely Missing**: Not a single route or UI view exists for Adventures, Groups, or Friend management. |

---

## 3. Recommended Remediation & Implementation Strategy

To align the codebase perfectly with the **Wanderlust Companion Implementation Plan** and make the app fully functional, we should execute the following targeted cleanup and refactoring in the next session:

1. **Purge the Next.js Dead Weight**:
   - Delete the entire `src/app/` directory. This will clear the build logs of all errors related to next metadata, server components, and route handlers.
2. **Consolidate Backend Proxying to Netlify Functions**:
   - Use `netlify/functions/places-search.ts` and `netlify/functions/places-get.ts` exclusively for serverless proxying to the Foursquare API, keeping your credentials hidden from the client browser.
3. **Enable client-side Supabase interactions**:
   - Rewrite the database actions (like saving places, deleting places, loading profile details, creating adventures) to use the client-side `supabase` instance located in `src/lib/supabase/client.ts`. This utilizes standard web API protocols and works seamlessly in a Vite SPA.
4. **Activate the Mapbox Component**:
   - Replace the generic Leaflet OpenStreetMap wrapper (`src/components/MapView.tsx`) with the Mapbox GL JS component (`src/components/map/MapView.tsx`). Ensure the Mapbox token in `.env` is loaded using Vite's `import.meta.env.VITE_MAPBOX_ACCESS_TOKEN`.
5. **Implement the Missing v1 Modules**:
   - Build a gorgeous premium bottom navigation bar (`BottomNav.tsx`) to switch views on mobile.
   - Build UI tabs/views for **Saved Places**, **My Adventures** (collaboration and custom lists), and **Social/Groups** as planned.
