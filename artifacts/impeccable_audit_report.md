# Venture — /impeccable audit

**Date**: 2026-08-14
**Scope**: React 18 + Vite 5 + Tailwind v4 + shadcn/ui (monolithic `radix-ui`) + Supabase + MapLibre/Protomaps + Netlify functions. Code-level audit; issues documented, **nothing fixed**.

**Method**: full source read of every `src/` page, component, hook, lib, and UI primitive; DB schema + migrations + Netlify functions + Supabase config; detector (`--no-config`); `npm run lint`, `npx tsc --noEmit`, `npm run build`; live runtime pass at `390×844` via Playwright MCP against `netlify dev`.

**Verification gates**: lint 0 errors / 4 `react-refresh` warnings (3 baseline + `NotificationsProvider`); `tsc` clean; build passes (42.7s) with chunk-size warning. Runtime: Home, Map, search→place-sheet, login error toast, dark-mode toggle, mobile menu all exercised; 0 console errors (only 2 react-router future-flag warnings + the intentional 400 on bad login).

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | **2/4** | `<html>` has no `lang`; no reduced-motion handling |
| 2 | Performance | **2/4** | 1.98 MB main bundle, zero code splitting (543 kB gzip) |
| 3 | Responsive Design | **3/4** | Verified clean at 390px; touch targets slightly <44px |
| 4 | Theming | **3/4** | Solid tokens; `sonner` hardcoded `theme="light"` breaks dark toasts |
| 5 | Implementation Integrity | **2/4** | Wrong share URL + dead `/groups` links + no 404 route |
| **Total** | | **12/20** | **Acceptable — significant work needed** |

## Implementation Integrity Verdict — **FAIL (coherent, with functional inconsistencies)**

The system is genuinely product-specific and coherent: token-driven shadcn/Radix UI, a real saved-places ↔ adventures ↔ sharing data model, consistent layout and map integration. Detector output is clean (single inline-ignored advisory `codex-grid-background` at `globals.css:171`). **However**, there are several verified functional contradictions that break the product story and would mislead users — most notably the Adventures list's share button copying a *protected* URL while a full public-sharing system (`publicShareUrl`, tokens, `ShareAdventureModal`, `PublicShareLink`) exists and works elsewhere, plus notification links pointing to routes that don't exist.

## Detailed Findings by Severity

### P0
None.

### P1

1. **Adventures share button copies the wrong URL + feature stub**
   - **Location**: `src/Adventures.tsx:231,236`
   - **Category**: Implementation Integrity
   - **Impact**: On the Adventures list, sharing a *public* adventure copies `${origin}/adventures/:id` — the private, auth-protected route. Anyone opening it hits the login wall or a 404. Non-public adventures just toast *"Sharing is coming soon"* — a dead stub that contradicts the working `ShareAdventureModal`/`PublicShareLink` system built for the exact same data model.
   - **Recommendation**: Use `publicShareUrl(token)` from `src/lib/adventureSharing.ts:73`; route the copy target to `/adventures/public/:publicToken`; drop or implement the stub.
   - **Suggested command**: `/impeccable harden`

2. **Dark-mode toasts are force-rendered in light theme**
   - **Location**: `src/components/ui/sonner.tsx:9`
   - **Category**: Theming
   - **Impact**: Runtime-confirmed: while `<html class="dark">`, the toaster carries `data-sonner-theme="light"`. Sonner's light-theme chrome (close button, hover states, spacing, progress) renders light; only the CSS-var overrides (`--popover`) keep the body dark. Dark-mode users get visually mixed toasts that also never adapt to a live theme switch.
   - **Recommendation**: Drop the hardcoded `theme="light"` and feed `resolvedTheme` from `next-themes` (e.g. `<Toaster theme={resolvedTheme} />`).
   - **Suggested command**: `/impeccable colorize`

3. **No route-level code splitting — 2 MB single JS chunk**
   - **Location**: `src/App.tsx:49-72` (all pages statically imported); build output `index-*.js 1,981.81 kB` (542.91 kB gzip); MapLibre worker 471 kB separate
   - **Category**: Performance
   - **Impact**: Every page — including the marketing homepage and login — pays the full cost of MapLibre + the whole app upfront. Slow first paint on mobile networks; Vite emits the >500 kB chunk warning.
   - **Recommendation**: `React.lazy` the heavy pages (`Adventures`, `AdventureDetail`, maps) or split `maplibre-gl` into its own async chunk; aim for <500 kB gzip on the main path.
   - **Suggested command**: `/impeccable optimize`

4. **Missing `lang` on `<html>`**
   - **Location**: `index.html`; runtime-confirmed `document.documentElement.lang === ""`
   - **Category**: Accessibility (WCAG 3.1.1 Language of Page)
   - **Impact**: Screen readers and translation tools cannot determine the page language; TTS may pronounce English text with the wrong voice/accent.
   - **Recommendation**: Add `lang="en"` to the `<html>` tag.
   - **Suggested command**: `/impeccable adapt`

### P2

5. **Dead notification links → `/groups/:id`**
   - **Location**: `src/components/NotificationsSheet.tsx:47` vs routes in `src/App.tsx` (no `/groups/*`); group pages absent (only `src/lib/groups.ts`)
   - **Category**: Implementation Integrity
   - **Impact**: `group_invite` notifications render a `Link` to a route that doesn't exist → blank `<main>`. Users tapped into a dead end from a system that implies a group feature.
   - **Recommendation**: Add the group pages + routes, or remove group sharing/invites until they exist.
   - **Suggested command**: `/impeccable harden`

6. **No 404 / catch-all route**
   - **Location**: `src/App.tsx:72` (no `path="*"`); runtime-confirmed `/nonexistent-route` renders an empty `<main>` between header/footer
   - **Category**: Implementation Integrity / Accessibility
   - **Impact**: Unknown URLs (including mistyped share links) silently show a blank content area — no guidance, no link home.
   - **Recommendation**: Add a `*` route with a friendly not-found view + link home.
   - **Suggested command**: `/impeccable harden`

7. **No `prefers-reduced-motion` handling**
   - **Location**: global — zero matches for `motion-reduce`/`prefers-reduced-motion` in `src/`; `motion` `fadeUp` on Home, `PageTransition`, `tw-animate-css`
   - **Category**: Accessibility (WCAG 2.3.3)
   - **Impact**: Users with vestibular/motion disorders get full entrance transitions and page animation with no reduced alternative.
   - **Recommendation**: Respect `useReducedMotion` (motion) or `MotionGlobalConfig.reducedMotion`; keep `fadeUp`/transitions as a graceful fallback that still shows content.
   - **Suggested command**: `/impeccable adapt`

8. **Drag-to-dismiss control is pointer-only**
   - **Location**: `src/components/PlaceDetails.tsx:286-288` (`role="button"` + `tabIndex={-1}`)
   - **Category**: Accessibility (WCAG 2.1.1 Keyboard)
   - **Impact**: The "Drag to dismiss" handle is presented as a button but cannot be focused or activated by keyboard; the sheet itself closes via Radix (Esc/X), so this is a redundant trap for keyboard/screen-reader users.
   - **Recommendation**: Wire the handle to the close action as a real `Button`, or remove the `role`/dismiss affordance for non-pointer input.
   - **Suggested command**: `/impeccable adapt`

9. **Non-null assertions on possibly-undefined env vars**
   - **Location**: `src/lib/supabase/client.ts:3-6`
   - **Category**: Implementation Integrity
   - **Impact**: If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, `createBrowserClient(url!, anon!)` receives `undefined` and throws at module load — blank app with no actionable error.
   - **Recommendation**: Validate and throw a descriptive error, or read from a generated env file.
   - **Suggested command**: `/impeccable polish`

10. **'Places' sort fetches up to 1000 rows and sorts client-side**
    - **Location**: `src/Adventures.tsx` (sortBy `'places'` branch, `ADVENTURES_PAGE_SIZE` 1000), aligns with `max_rows = 1000` in `supabase/config.toml:18`
    - **Category**: Performance
    - **Impact**: On datasets near the cap, every filter/sort change re-fetches 1000 adventures and merges in JS — jank and wasted bandwidth.
    - **Recommendation**: Do the ordering in SQL (or a view) and paginate.
    - **Suggested command**: `/impeccable optimize`

11. **Render-blocking Google Fonts**
    - **Location**: `index.html` (Nunito Sans stylesheet without `media`/`preload`; `display=swap` may be set but CSS load still blocks render)
    - **Category**: Performance
    - **Impact**: First paint is gated on the font CSS download; FOUT/FOIT on slow connections.
    - **Recommendation**: Self-host or preload with `rel="preload" as="style"` + `media="print" onload` swap.
    - **Suggested command**: `/impeccable optimize`

### P3

12. **Undefined utility class silently no-ops** — `ease-airbnb` at `src/components/PlacesSearch.tsx:204`; Tailwind v4 silently ignores it → search button loses its intended easing.
13. **Orphan component** — `src/components/navigation/BottomNav.tsx` is never imported anywhere (dead code, adds bundle weight if included).
14. **Duplicated logic** — `haversineKm`/`formatDistance` reimplemented in `PlaceDetails.tsx:46-66` vs `lib/distance.ts:2-20`; `ensureUrl` in both `PlaceDetails.tsx:80` and `SavedPlaceDetails.tsx:38`; `RatingStars` duplicated in `AdventureDetail.tsx:82`, `AdventurePublicView.tsx:42`, `SavedPlacesList.tsx:20` (token-consistent, but drift risk).
15. **Stub UI** — `Profile.tsx` "Saved places" tab shows a static *"No saved places yet"* empty state regardless of actual data.
16. **Native `<select>`** in `SavedPlaces.tsx:378-389` vs the shadcn `Select` used in `Adventures.tsx` (has aria-label; inconsistency only).
17. **Touch targets** — icon buttons use `size-10` (40px) and close/star buttons are smaller; under the 44px guideline on mobile.
18. **Tooling hygiene** — React Router v6 future-flag warnings (`v7_startTransition`, `v7_relativeSplatPath`) logged at runtime; Vite CJS Node API deprecation warning; `shadcn` listed in `dependencies` (should be `devDependencies`).
19. **Acceptable hard-codes** (noted, not defects): `#ffffff` map-label paint in `MapView.tsx:246`/`SavedPlacesMap.tsx:123`; `text-white` over image cards on `Home.tsx`; demo-fallback canned results in `netlify/functions/places-search.ts:44` / `places-get.ts:35` (deliberate, documented).

## Patterns & Systemic Issues

- **Feature-gap inconsistencies**: the app ships a polished sharing system but the Adventures list's primary share affordance is broken/stubbed (`:231/:236`), and the groups feature is referenced across notifications/schema/`ShareAdventureModal` but has no UI route. This is the largest systemic gap.
- **No performance architecture**: one monolithic chunk, no lazy loading anywhere, one client-side "sort all" path — the codebase has no splitting or pagination strategy yet.
- **A11y is foundationally strong but unfinished**: every interactive surface uses Radix with labels/focus, but the "global" items (lang, reduced motion) are missing and one custom control is pointer-only.

## Positive Findings

- **A11y base is excellent**: Radix dialogs/sheets/tabs/dropdowns everywhere; labeled inputs on Login/Signup; rating stars are `role="img"` with `aria-label` (`Rated N out of 5 stars`); logical heading hierarchy; keyboard-operable dnd via `sortableKeyboardCoordinates`.
- **Theming is token-driven**: full CSS-var light/dark system in `globals.css`, `next-themes` with `class` strategy; runtime-confirmed `dark` class; `EdelweissMark` uses `currentColor`; no hard-coded color drift in components.
- **Responsive verified at runtime**: no horizontal overflow at 390px on Home or Map; mobile header collapses to a Radix `Sheet` menu; map uses `dvh`; attribution/demarker controls legible on mobile.
- **Defensive engineering**: `useMapLibre` StrictMode/worker-URL guard; `PlacesSearch` debounce + cancelled-flag + click-outside/Escape; `NotificationsProvider` mounted-ref; `PublicShareLink` regenerate catches rejections and toasts (no unhandled rejections); `UserProfile`/`AdventureCreate` redirect on self/owner mismatch.
- **Engineering gates pass**: lint 0 errors, `tsc --noEmit` clean, production build succeeds, and the full map→search→place-sheet flow runs with zero console errors.

## Recommended Actions

1. **[P1] `/impeccable optimize`**: `React.lazy` heavy routes (`Adventures`, `AdventureDetail`, map pages) and/or split `maplibre-gl`; target <500 kB gzip main path.
2. **[P1] `/impeccable harden`**: point `Adventures.tsx` share to `publicShareUrl(token)`; add `/groups/:id` pages or remove dead group links; add a `*` catch-all 404 route.
3. **[P1] `/impeccable adapt`**: add `lang="en"` to `index.html`; add `prefers-reduced-motion` handling; make the drag-dismiss handle keyboard-operable.
4. **[P1] `/impeccable colorize`**: drive `sonner` theme from `resolvedTheme` instead of hardcoded `"light"`.
5. **[P2] `/impeccable distill`**: remove orphan `BottomNav`, dedupe `haversine/formatDistance/ensureUrl/RatingStars`, delete the `Profile` saved-places stub.
6. **[P2] `/impeccable polish`**: guard Supabase env access, swap `SavedPlaces` native select, bump undersized touch targets, address react-router/vite deprecation warnings — then finish with `/impeccable polish`.

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/impeccable audit` after fixes to see your score improve.
