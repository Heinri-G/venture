# Security First: Secret Management & Best Practices

1. **Never Hardcode Secrets**: NEVER place API keys, database URLs, or access tokens directly in source code (`.ts`, `.tsx`, `.js`, etc.). They must come from environment variables.
2. **Environment Variables**: Store credentials in `.env` for local development. Keep a committed `.env.example` listing all required variable names with empty values so the app is easy to set up.
3. **.gitignore**: Ensure `.env` and other local credential files are gitignored and never pushed to the repository. Only `.env.example` is committed.
4. **Client vs Server Secrets**:
   - Only `VITE_`-prefixed variables are exposed to the browser (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   - Backend keys must NOT have a `VITE_` prefix and must only be used in Netlify Functions or other server-side code (e.g. `FOURSQUARE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
5. **Proxy Secrets Through Netlify Functions**: Proxy third-party APIs (like Foursquare) through Netlify Functions under `netlify/functions/` so secret keys never reach the client. Never call those APIs directly from the browser with a secret key.
6. **Row Level Security (RLS)**: Always enable RLS on Supabase tables and use the anon key client-side so users can only access data they are authorized to see. Never expose the service role key to the client.
