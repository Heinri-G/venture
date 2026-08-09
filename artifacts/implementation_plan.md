# Implementation Plan: Wanderlust Companion

This document outlines the technical implementation plan for building the first version (v1) of the Wanderlust app, optimized to be essentially **free** to operate at MVP scale while maintaining a premium, mobile-first experience.

## 1. App Architecture & Tech Stack

* **Frontend Framework**: **React + Vite** (optionally built as a Progressive Web App using Vite PWA plugin). Vite provides very fast local development and simple production builds.
* **Styling**: **Tailwind CSS**. We will strictly follow a mobile-first design approach.
* **Backend & Database**: **Supabase** (PostgreSQL). Handles user auth (Google/Email), relational database (Places, Adventures, Users, Groups), and storage (Avatars and user-uploaded photos). Supabase's free tier is very generous and perfect for v1.
* **Maps**: **Leaflet + OpenStreetMap**. 
 
* **Places Data**: **Foursquare Places API** or similar third-party places provider.
  * *Cost*: Generous free tier for typical MVP usage.
  * *Benefit*: Rich POI data without high Google costs.
* **Serverless Functions / API**: **Netlify Functions**
  * *Why*: Securely proxy external APIs (e.g., Foursquare) and run server-side actions without exposing keys. Functions live under netlify/functions or src/netlify/functions.
* **Hosting & Deployment**: **Netlify**
  * *Why*: Automatic deploys from GitHub main branch, built-in support for Netlify Functions, and an easy UI for environment variables and redirects.

## 2. Security First & Secret Management

To ensure a highly secure architecture from day one:
* **Environment Variables**: All sensitive credentials (Supabase URLs, Netlify tokens, Foursquare API keys) will be stored in `.env` during local development and managed via the Netlify UI (site settings > Environment > Environment variables) in production.
* **Backend Proxying**: We will never expose backend API keys (like Foursquare) to the client browser. All external API requests must be proxied securely through Netlify Functions.
* **Database Security**: Supabase Row-Level Security (RLS) will be enabled by default on all tables to ensure users can only read/write data they own or have been granted access to.
* **Source Control**: `.env` (local secrets) and any files containing raw tokens will be ignored in `.gitignore` and secrets configured in Netlify for production.

## 3. Database Schema (Supabase)

We will need the following core tables:
* `users`: id, display_name, avatar_url
* `places`: id, foursquare_fsq_id, name, address, location (lat/lng), category, photo_url
* `saved_places`: id, user_id, place_id, notes, rating
* `adventures`: id, owner_id, title, description, visibility (private, shared, public), allow_collaboration (boolean)
* `adventure_places`: adventure_id, saved_place_id, order_index
* `friends`: user_id_1, user_id_2, status (pending, accepted)
* `groups`: id, name
* `group_members`: group_id, user_id, role

## 4. Implementation Steps

### Phase 1: Project Setup & Auth
1. Initialize a Vite + React project with Tailwind CSS and configure optional PWA support using Vite PWA plugin.
2. Set up Supabase project and connect it to the app (client + secure server functions for secret work).
3. Implement Authentication (Sign up, Login, Logout) and basic User Profiles.
4. Configure Netlify site with automatic deploys from GitHub main branch and set production environment variables.

### Phase 2: Map & Places Integration
1. Integrate Leaflet API to render a full-screen, interactive mobile map.
2. Implement a search bar powered by the Foursquare Places API (Autocomplete) proxied via Netlify Functions.
3. Allow users to tap on places on the map or search to view details (fetching rich details from the places provider via serverless proxy).
4. Implement the "Save" functionality (saving the place to Supabase along with user notes and ratings).

### Phase 3: Adventures & Collaboration
1. Create the UI for viewing lists of saved places.
2. Implement the ability to create an "Adventure" and add saved places to it.
3. Implement the `allow_collaboration` setting, allowing multiple users to edit an adventure if it is shared in a group.
4. Implement shareable public links for Adventures (static public pages or client-side rendering depending on SEO needs).

### Phase 4: Social Features (Friends & Groups)
1. Build the Friends system (search users, send/accept requests).
2. Build Groups functionality.
3. Allow sharing specific Adventures with Friends/Groups.

## 5. Future Iterations (Post v1)
* **Share Target API**: As a PWA, register the app as a "Share Target" eventually so users can share links directly from other apps.
* **Offline Support**: Cache saved places and maps using Service Workers for when the user is traveling without cell service.
* **Native Mobile Apps**: If needed, wrap the web app with Capacitor for iOS/Android releases.

## Verification Plan
1. **Automated Tests**: Set up simple rendering tests for core components.
2. **Manual Verification**: Test primarily on mobile device simulators (or browser dev tools set to mobile view) to ensure the UI feels like a native mobile app.
