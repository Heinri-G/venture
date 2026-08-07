Handover: Vite + Netlify migration (current state)

Overview
--------
This document summarizes progress, work already done, blockers, and prioritized next steps so a follow-up agent can continue the migration with minimal ramp-up.

Status summary (current)
------------------------
- Analysis: Complete — located app files, API routes, server actions, and Supabase integration targeted for Vite + Netlify.
- Changes applied: package.json scripts replaced for Vite (dev/build/start). Some Next.js dependency references removed from package.json.
- Todos: All migration todos created and set to in_progress in session DB.
- Files inspected (key):
  - vite.config.ts
  - src/main.tsx, src/App.tsx (or src/App/index.tsx)
  - src/pages or src/routes equivalents converted from src/app pages
  - src/app/auth/actions.ts (migrate logic into client + Netlify Functions)
  - src/app/actions/places.ts
  - netlify/functions/places-get.ts (from route.ts [id])
  - netlify/functions/places-search.ts (from route.ts search)
  - src/lib/supabase/* (referenced; adapt for browser + Netlify Functions)

What was NOT changed yet
------------------------
- No new Vite config, index.html, or main.tsx were created.
- No Netlify Functions were created yet under netlify/functions.
- Supabase client/server code not refactored for functions/browser separation.
- Tailwind/PostCSS and tsconfig may need small updates for Vite.
- Full dependency install was not completed in this session (PowerShell policy issues required manual confirmation from the user).

Blocking items / prerequisites you should verify first
----------------------------------------------------
- Run npm install locally after package.json edits; ensure Node version matches project expectations (check engines in package.json if present).
- Ensure PowerShell/terminal allows scripts if running CLI commands on Windows (Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass for the session) or run commands in an elevated terminal.
- Set Netlify CLI (optional): npm i -D netlify-cli for local function testing (or use netlify dev).

Environment variables (required / recommended)
---------------------------------------------
Add to .env (or Netlify UI env vars):
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY  # used only by server-side Netlify functions
- FOURSQUARE_API_KEY
- NODE_ENV (development/production)
- OPTIONAL: VITE_* prefix for client-exposed envs (Vite requires VITE_ prefix for client-accessible env vars)

Files to create / update (priority list)
----------------------------------------
1. package.json
   - Add dependencies: react, react-dom, vite, @vitejs/plugin-react, react-router-dom, @supabase/supabase-js, cross-env (optional)
   - Dev dependencies: netlify-cli (optional), types for react/react-dom, vite types if using TypeScript
2. vite.config.ts
   - Configure plugin-react, path alias (@ -> src), define process.env fallback if needed
3. index.html
   - Vite entry with <div id="root"></div>
4. src/main.tsx
   - Mount React app; import Tailwind globals.css
5. src/App.tsx (or src/App/index.tsx)
   - Convert RootLayout to React layout and wire React Router routes (/, /login, /signup, /places/:id, etc.)
6. src/pages/* or src/routes/*
   - Convert page.tsx, login and signup pages into React components using forms and client-side handlers
7. src/lib/supabase/client.ts
   - Browser client: createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
8. src/lib/supabase/server.ts (for functions)
   - Server client factory using SUPABASE_SERVICE_ROLE_KEY (do NOT commit service role key)
9. netlify/functions/places-get.ts (from route.ts [id])
   - Netlify function handler that proxies Foursquare or returns demo data when key missing
10. netlify/functions/places-search.ts (from route.ts search)
11. netlify/functions/save-place.ts
   - Convert server action savePlace to Netlify function; use supabase server client
12. Update Tailwind and PostCSS configs to work with Vite and ensure globals.css import path is correct
13. tsconfig.json
   - Update 'paths' and 'jsx' settings for Vite + React (jsx: 'react-jsx' or 'react-jsxdev')

Conversion notes / mapping
-------------------------
- Next.js server actions and API routes → Netlify Functions.
  - Convert Next.js Request/Response handlers to Netlify's handler(event, context) format.
  - Map `request.nextUrl.searchParams` to new URL or event.queryStringParameters.
- Replace framework-specific helpers (e.g., revalidatePath, redirect) with client-side navigation and webhook approaches where needed; favor client refresh or webhooks for cache invalidation.
- Image/Font optimizations: remove framework-specific helpers like next/image; use standard <img> or a lightweight image component. Use link or local font import instead of framework font helpers.
- For environment exposure: Vite requires env vars prefixed with VITE_ to be exposed in client bundles.

Suggested Netlify function handler pattern (pseudo)
--------------------------------------------------
exports.handler = async function(event, context) {
  try {
    // event.queryStringParameters or new URL(event.path, 'http://localhost')
    // call Foursquare or Supabase
    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

Testing & local dev
-------------------
- Install dependencies: npm install
- Start Vite dev server: npm run dev  (configured to run `vite`)
- Start Netlify functions locally (optional): npx netlify dev or netlify dev (Netlify CLI) — this runs functions and the frontend together
- Verify Supabase integration by signing in/out and exercising savePlace and search endpoints

Verification checklist
----------------------
- [ ] App boots with `npm run dev` and renders the main layout
- [ ] Login/signup flows call Supabase (browser client) and respect redirects/navigation
- [ ] Places search returns valid demo data without FOURSQUARE key and real data with key
- [ ] savePlace function creates/upserts in `places` table and respects auth
- [ ] CI / Netlify build: run `npm run build` and `netlify deploy --prod` (or use GitHub→Netlify integration on main branch)

Suggested next-agent tasks (high-priority)
------------------------------------------
1. Add missing dependencies and run npm install; commit package-lock.json or pnpm-lock if using pnpm.
2. Create Vite config, index.html, src/main.tsx and wire RootLayout → Layout component.
3. Convert pages to React Router routes; ensure client-side form handling calls Netlify functions (or Supabase directly where appropriate).
4. Implement Netlify functions for the two Foursquare-based routes and server functions that interact with Supabase.
5. Update docs: README.md, docs/architecture.md, AGENTS.md, and .env.example with required env variables.
6. Run local verification steps and fix any import/path issues.

Commit guidance
---------------
- Make small, focused commits (e.g., "chore(vite): add vite config and index.html").
- Include Co-authored-by trailer: "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" unless instructed otherwise.
- Do NOT commit secrets; use .env and add .env* to .gitignore.

Where to look for context
-------------------------
- vite.config.ts — review to learn what remote image hosts or build-time settings are needed
- src/* — React components, pages/routes, and server action references
- src/app/api/places/* — API logic that must be migrated
- src/lib/supabase/* — client/server patterns to adapt

Contact points
--------------
- This HANDOVER.md (root) — primary artifact for the next agent
- Todos stored in session DB — review todos table for in_progress items

End of handover
--------------

Start with "npm install" then create Vite entry files; most migration friction will be in converting server actions and API route signatures to Netlify function handlers and ensuring Supabase service-role keys are used server-side only.