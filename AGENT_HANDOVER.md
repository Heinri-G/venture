Agent Handover — Venture (short)

Summary:
- Workspace merged from migration worktree into this Venture folder. Backup created at: C:\Users\hfger\Desktop\DEV\Venture-backup-20260807-150500
- Dependencies installed and dev server + Tailwind build validated.
- Client-side env usage fixed (use import.meta.env in browser code).
- PostCSS/Tailwind config fixed; Tailwind directives added to globals.
- Playwright run captured screenshots: playwright-screenshot.png and playwright-screenshot-5173.png in repo root.

How to run locally:
1. Copy .env.example -> .env and fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for dev.
2. npm install
3. npm run dev  (opens Vite server at http://localhost:5173)
4. If styles look missing: hard refresh (Ctrl+Shift+R).

Important files & locations:
- Browser Supabase client: src/lib/supabase/client.ts
- Server (functions) Supabase usage: src/lib/supabase/server.ts or netlify/functions/
- Global CSS/Tailwind: src/globals.css and src/app/globals.css
- Vite config: vite.config.ts
- Tailwind config: tailwind.config.cjs
- PostCSS config: postcss.config.mjs
- Netlify functions: netlify/functions/
- Entry: src/main.tsx, src/App.tsx, src/components/Layout.tsx

Secrets & envs:
- Do NOT commit .env. For production, set VITE_* variables and SUPABASE_SERVICE_ROLE_KEY in the Netlify UI or a secrets manager.

Outstanding / Recommended next steps:
1. Verify pages for missing components and implement Netlify functions for server actions (migrate server logic under src/app/api/* into netlify/functions/ endpoints).
2. Review package.json for dependency clean-up and fix high-severity vulnerabilities as time allows.
3. Add CI (GitHub Actions) with secrets and a Netlify deploy step (auto-deploy from main branch).
4. Run tests and smoke-check auth flows against a real Supabase project.

Notes:
- Dev server must be the canonical instance at port 5173; multiple node dev processes were running during investigation which caused stale HMR or different ports.
- A small set of legacy Next.js artifacts were retained as non-breaking stubs for TypeScript tooling (e.g., next-env.d.ts converted to a harmless stub). Remove only if you fully understand the implications.
- Backup contains previous Venture folder content — restore if anything was overwritten unexpectedly.

If you want, next agent can: start dev server, run tests, wire Netlify functions, or add CI. Contact me which to do first.
