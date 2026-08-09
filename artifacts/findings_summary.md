# Venture Project Migration & Findings Summary

This document summarizes the current status of the Venture (Wanderlust Companion) project, including architectural decisions, technology stack, directory layout, environmental configurations, and security practices as of August 2026. This serves as the master context file for future implementations.

---

## 1. Project Background & Migration Status
The Wanderlust Companion was successfully migrated from a Next.js workspace into a **React + Vite (TypeScript)** frontend application coupled with **Netlify Functions** for backend serverless execution. 

### Key Milestones Completed:
* **Vite + Tailwind Build Validation**: The package dependencies and Tailwind v4 configuration have been successfully set up and validated.
* **Client-Side Env Standard**: Transitioned all browser-accessible environment variables to the Vite standard (`import.meta.env.VITE_*`).
* **Dev Server Configuration**: The canonical dev server operates on port `5173`.
* **Testing Infrastructure**: Playwright has been executed, confirming that basic pages load successfully and capturing baseline screenshots (`playwright-screenshot.png`).
* **BaaS Integration**: Supabase is configured as the primary backend for Database, Auth, and Storage.

---

## 2. Directory Structure & Key Files

The current codebase is organized as follows:

```
c:/Users/hfger/Desktop/DEV/Venture/
├── artifacts/                # Specs, implementation plans, and individual task files
├── netlify/
│   └── functions/            # Netlify Serverless Functions (proxies and secure actions)
├── public/                   # Public assets (icons, manifest.json, etc.)
├── scripts/                  # DB connection and debug automation scripts
├── src/
│   ├── app/                  # Application layout components
│   ├── components/           # Reusable UI components
│   ├── lib/
│   │   └── supabase/         # Supabase client configurations
│   │       ├── client.ts     # Browser-side client (VITE_ prefixed keys)
│   │       └── server.ts     # Netlify Functions client helper (Service role key)
│   ├── App.tsx               # Main React entry & routing routing
│   ├── globals.css           # Global Tailwind CSS styles
│   ├── main.tsx              # React mounting file
│   └── Profile.tsx, Login.tsx, Signup.tsx, Home.tsx (Core Pages)
├── postcss.config.mjs        # PostCSS configurations for Tailwind
├── tailwind.config.cjs       # Tailwind v4 configuration
└── tsconfig.json             # TypeScript compiler rules
```

---

## 3. Environment Variables & Secrets Management

To prevent security leaks, client code must never have access to service role keys or third-party provider keys (like Foursquare).

### Local Configuration (`.env`)
Create a `.env` in the root of the project (never commit this file) with the following parameters:

```env
# Client-side (Vite Prefixed)
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...

# Server-side (Netlify Functions only - NOT prefixed)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5...
FOURSQUARE_API_KEY=fsq3_...

# Maps: none required (Leaflet + OpenStreetMap is tokenless)
```

### Production Configuration
Configure these variables directly within the Netlify UI under **Site settings > Environment > Environment variables**.

---

## 4. Architectural Patterns & Rules

1. **Keep Frontend Lean**: All external API integrations (Foursquare search, details, etc.) and database queries requiring high-level credentials must be proxied through Netlify serverless functions (`netlify/functions/`).
2. **Supabase Row-Level Security (RLS)**: RLS must be enabled on all database tables. Clients should query tables directly using the standard web client (`src/lib/supabase/client.ts`) which enforces RLS constraints.
3. **No Framework Helpers**: Avoid standard Next.js specific components like `next/image` or `next/font`. Use basic HTML `<img>` tags or lightweight React wrappers and CSS imports.
4. **Mobile First Design**: Align UI layouts to mobile devices as primary clients, utilizing Tailwind's responsive breakpoints (`md:`, `lg:`) to scale upwards.
