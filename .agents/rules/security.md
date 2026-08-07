# Security First: Secret Management & Best Practices

1. **Never Hardcode Secrets**: NEVER place API keys, database URLs, or access tokens directly into the source code (`.ts`, `.tsx`, `.js`, etc.).
2. **Environment Variables**: Always store sensitive credentials in a `.env.local` file for local development.
3. **.gitignore**: Ensure `.env`, `.env.local`, and any other local credential files are added to `.gitignore` so they are never pushed to the repository.
4. **Client vs Server Secrets**: 
   - Only variables prefixed with `NEXT_PUBLIC_` are safe to expose to the browser (e.g., `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` since Mapbox relies on URL/Origin restrictions).
   - Backend keys (like `FOURSQUARE_API_KEY` or Supabase Service Role Keys) MUST NOT have the `NEXT_PUBLIC_` prefix and must only be used in Next.js Server Components, Server Actions, or API Routes.
5. **Row Level Security (RLS)**: Always enable RLS on Supabase tables to ensure users can only access or modify data they are authorized to see.
