# Security First: Secret Management & Best Practices

1. **Never Hardcode Secrets**: NEVER place API keys, database URLs, or access tokens directly into the source code (`.ts`, `.tsx`, `.js`, etc.).
2. **Environment Variables**: Always store sensitive credentials in a `.env.local` file for local development.
3. **.gitignore**: Ensure `.env`, `.env.local`, and any other local credential files are added to `.gitignore` so they are never pushed to the repository.
4. **Client vs Server Secrets**: 
   - Only variables prefixed with `VITE_` are safe to expose to the browser (e.g., `VITE_SUPABASE_ANON_KEY` or a tile-provider key such as `VITE_TILE_PROVIDER_KEY`). Leaflet + OpenStreetMap requires no token.
   - Backend keys (like `FOURSQUARE_API_KEY` or Supabase Service Role Keys) MUST NOT have the `VITE_` prefix and must only be used in Netlify Functions or other server-side code.
5. **Row Level Security (RLS)**: Always enable RLS on Supabase tables to ensure users can only access or modify data they are authorized to see.
