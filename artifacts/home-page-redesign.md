# Home / Landing Page Redesign — Handoff Plan

## Status
Approved by the user (2026-08-14). Ready for implementation. No code changes for this
plan have been written yet — this is the full brief for the next agent to pick up.

## Decisions locked (from the audit Q&A)
- **Remove the embedded map from the home page entirely.** Route all map exploration
  to `/map` (the existing fullscreen map page). The current hero demo duplicates `/map`
  (same 500-pin Supabase load, same Foursquare search, same sheets) at heavy performance
  cost, and it proves *search* — not the product's real value (the lasting library).
- **Redesign the page layout, hierarchy, and copy** to sell the travel-library story:
  save & rate with notes, ordered adventures, sharing with friends/groups.
  Keep the existing identity: edelweiss mark, `bg-meadow` dot texture, sage/green oklch
  tokens, Nunito Sans, pill buttons/sheets, `--radius: 1rem`, `--ease-venture` motion.
- **Logged-in users get routed to `/map`** instead of the marketing page (new `/` wrapper).
- **Constraints:** keep the brand voice/travel-companion copy tone; no fabricated stats
  (PRODUCT.md forbids the placeholder "10k+ places / 120+ countries / 4.9★" claims).
  Real place facts come only from Foursquare data.

## Source files
- `src/Home.tsx` — the page to rewrite.
- `src/App.tsx` — add logged-in redirect wrapper at `/` (mirror of `ProtectedRoute` but
  inverted: `<Navigate to="/map" replace />` when a user exists). Check `useAuthUser` /
  `supabase.auth.getUser()`.
- `src/components/MapView.tsx` — remove from Home; optionally gate `DEMO_MARKERS` behind a
  dev-only flag so demo data can never reach a production/marketing surface.
- `src/components/search/SearchBar.tsx` — only imported by Home.tsx; delete it after Home
  stops using it. `/map` already uses the superior `PlacesSearch` (keyboard nav, empty/error
  states, ARIA combobox).
- `src/components/Layout.tsx` — when logged out, trim nav to Home + Map and show both
  "Sign in" and "Create account" (fixes app-chrome leak + inconsistent funnel labels).
- `src/globals.css` — darken `--muted-foreground` slightly (light: lightness 0.56 → ~0.52)
  to lift body text over 4.5:1 (currently 4.17:1 on page background).

## New Home structure (mobile-first)
1. **Hero** (keep `bg-meadow-hero`): refined H1/sub in existing voice naming the library
   (e.g. "Your travel library — for every place worth going back to", copy to be finalized).
   Primary CTA = conversion: **"Create your free library" → `/signup`**. Secondary ghost =
   **"Explore the map" → `/map`** (kills the scroll-vs-route duality).
2. **Showcase — "your library"** (replaces the map card): static proof-of-product built
   from shadcn UI + real Foursquare photos: a saved-place card (photo, name, category, your
   rating, your note), an adventures strip (ordered list w/ covers), a share chip (public
   link). Fetch ~6–8 real Foursquare photos once via existing `places-search` function,
   render as a static collage/rail with skeleton + graceful fallback. No map instance,
   no 500-row query, no tiles.
3. **"What you can do"** — replace `FEATURES` (currently Search/Save/Plan) with real
   differentiators: Save & rate with notes · Build ordered adventures · Share with friends
   & groups. Small UI mockups or alternating text+visual rows, not three text columns.
4. **CTA** — keep closing banner, sharpen copy, standardize signup labels across
   hero/CTA/header/mobile sheet.

## Audit fixes folded in
- P0 sheet duplication (Home.tsx:211 + MapView.tsx:434) — disappears with map removal.
- P0 control collision (locate button z-1100 over search submit; `Loading places...` badge
  over input) — disappears with map removal.
- P0 demo-data leak ("Demo Coffee — Mitte" markers) — gate behind dev flag in MapView.
- P1 search empty/error states + dead submit button — SearchBar deleted; PlacesSearch already
  correct on /map.
- P2 features section sells wrong product — replaced per structure above.
- P2 app chrome on landing page — Layout trims logged-out nav.
- Contrast: `--muted-foreground` token tweak (global improvement).

## Verification
- `npm run lint` (0 errors; ignore the 3 known `react-refresh` warnings in ui/*).
- `npx tsc --noEmit` (strict, must be clean).
- `npm run build`.
- Playwright via `netlify:dev` (localhost:8888; note ports drift to 65524/5175 in some
  sessions): logged-out `/` renders with no console errors; logged-in `/` redirects to
  `/map`; `/map` still works; mobile 390px has no horizontal overflow.
- Run `node .opencode/skills/impeccable/scripts/detect.mjs --json src/Home.tsx ...` on
  changed targets after finishing.

## Notes
- Do not rewrite DESIGN.md (no DESIGN.md exists; identity preserved, not replaced).
- Update docs if routing architecture changes per AGENTS.md.
- No secrets: test creds live in env (`TEST_USER2_PASSWORD`), never in code.
