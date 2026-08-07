Venture — Vite + React

This project is being migrated from Next.js to a Vite + React frontend, with Netlify Functions for backend endpoints and Supabase for auth, DB, and storage.

Quick start
-----------
1. Copy .env.example to .env and fill values (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, FOURSQUARE_API_KEY).
2. Install dependencies: npm install
3. Run dev: npm run dev

Local Netlify functions
----------------------
Install Netlify CLI (optional): npm i -D netlify-cli
Run with: npm run netlify:dev

See HANDOVER.md for detailed migration notes and next steps.
