# Venture Redesign — "Edelweiss Meadow"

User-selected direction **#15 Edelweiss Meadow** (preview `15-meadow.png`). A soft,
romantic alpine-meadow identity: warm cream, deep sage, periwinkle accent, blush
wildflower dots, edelweiss brand mark. Cohesive across every surface, light-first
with a deep pine-green dark mode.

## Design System

### Tokens (`src/globals.css`)
Replace the indigo/violet `:root` and `.dark` blocks with a meadow palette (oklch).
- `--background`: `oklch(0.965 0.012 85)` (warm cream #f7f3ea)
- `--foreground`: `oklch(0.35 0.035 140)` (deep sage #3d4a38)
- `--card` / `--popover`: `oklch(1 0 0)` warm-white; foreground = foreground
- `--primary`: `oklch(0.62 0.09 270)` (periwinkle #7d8fc4) → the accent
- `--primary-foreground`: `oklch(0.99 0 0)`
- `--secondary`: `oklch(0.68 0.06 130)` (meadow green #7f9a6d); `--secondary-foreground` near-white
- `--muted`: `oklch(0.945 0.01 100)`; `--muted-foreground`: `oklch(0.56 0.03 120)`
- `--accent`: `oklch(0.91 0.025 270)` (periwinkle tint); `--accent-foreground` = foreground
- `--destructive`: keep red `oklch(0.6 0.22 25)`
- `--border` / `--input`: sage-tinted `oklch(0.89 0.02 110)`; `--ring` = primary
- Charts: `chart-1` periwinkle, `chart-2` meadow green, `chart-3` lake blue
  `oklch(0.78 0.05 210)`, `chart-4` blush `oklch(0.8 0.07 20)`, `chart-5` deep sage
- `--sidebar*`: mirror card/foreground/primary
- `--radius`: `0.75rem` → `1rem` (softer, meadow-rounded); keep `rounded-full` pills

Dark mode (`.dark`) — "deep meadow at dusk", pine-green not navy:
- `--background`: `oklch(0.2 0.025 140)`; `--card`/`--popover`: `oklch(0.24 0.028 140)`
- `--foreground`: `oklch(0.95 0.012 100)`
- `--primary`: `oklch(0.72 0.08 270)` (lighter periwinkle); `--primary-foreground`: `oklch(0.18 0.02 140)`
- `--secondary`: meadow green lightened `oklch(0.55 0.06 130)`
- `--muted`: `oklch(0.28 0.025 140)`; `--accent`: `oklch(0.3 0.04 270)`
- `--border`: `oklch(1 0 0 / 12%)`
- Sidebar mirrors card tokens

### Typography (`index.html` + `@theme inline`)
- Load **Nunito Sans** (`400;600;700;800`) from Google Fonts in place of Inter.
- `--font-sans` / `--font-heading` → `"Nunito Sans", system-ui, ...` (single warm,
  friendly rounded family keeps the app cohesive and readable at mobile sizes).
- Keep `--ease-venture`; update `--font-heading` only if a serif accent is adopted later.

### Brand mark
- New `src/components/brand/EdelweissMark.tsx`: inline SVG 8-petal edelweiss
  (4 pointed petals + 4 offset, like preview #15 logo) using `currentColor` so it
  adapts to theme. Used in `Layout`, `Home` hero, `AuthShell`, and `favicon.svg`
  (public/favicon.svg replaced with the mark in periwinkle).

## Per-surface changes

### `src/components/Layout.tsx`
- Replace the gradient Compass logo tile with `EdelweissMark` (periwinkle on cream,
  `rounded-full`, soft ring) + wordmark "venture" (lowercase, tracking-wide,
  `font-heading`).
- Active nav pills: swap `bg-primary/10 text-primary` stays (now periwinkle via
  tokens) — no code change needed, verify only.
- Footer mark `MapPin` tile → `EdelweissMark` small; copy stays.
- Background decor: replace the three indigo/sky/violet `blur-3xl` blobs + `bg-grid`
  with a soft meadow wash (see utilities below).

### `src/globals.css` utilities
- Repurpose `bg-grid` → `bg-meadow`: fine sage contour lines
  (`oklch(0.35 0.035 140 / 0.05)`, 48px) OR a tiny wildflower-dot grid — used as a
  faint page texture.
- Replace `bg-hero` (indigo radial glows) → `bg-meadow-hero`: cream→pale-sage radial
  gradient with a soft periwinkle glow top-right and blush bottom-left; text-foreground
  dark ink (no longer a dark panel).

### `src/Home.tsx`
- Hero section: swap `bg-hero` → `bg-meadow-hero`; change badge, `h1`, `p` from
  `text-white/…` to foreground/muted variants; primary CTA uses tokens (auto).
- Add a small inline meadow SVG illustration (rolling sage hills + pale lake +
  blush wildflower dots + edelweiss) beneath/behind the hero copy — matches preview
  #15 map language; can reuse the `Home` map card art later.
- Feature cards: icon tiles `bg-primary/10 text-primary` (auto-tokenized); verify.
- CTA panel: `bg-hero` → `bg-meadow-hero` with foreground ink text instead of white.
- Microcopy pass to meadow tone (e.g. hero tagline "Your travel companion" → keep,
  section labels stay).

### Auth (`src/components/auth/AuthShell.tsx`, `src/Login.tsx`, `src/Signup.tsx`)
- Brand mark swaps in (Compass → `EdelweissMark`); cream page background, card
  `rounded-2xl` soft shadow; primary submit buttons tokenized (auto). Verify inputs
  pick up sage `--input`/`--ring`.

### Map (`src/components/MapView.tsx`, `src/lib/map/protomaps.ts`)
- `PRIMARY = '#5450e6'` → periwinkle `'oklch(0.62 0.09 270)'` (matches `--primary`).
  Cluster/point markers inherit automatically; keep white stroke.
- `protomaps.ts`: add a `venture`-flavored palette — land/water softened to sage +
  lake-blue in `light`, deep pine + muted teal in `dark`. Use `namedFlavor` as base
  and set an `venture:palette` override map passed through `layers()` options if the
  flavor API supports overrides; otherwise adjust via a post-processing paint pass
  over the returned layer list (documented inline).
- `Home` map card shadow `shadow-primary/10` → token (auto).

### Saved / Adventures / Profile / Friends / Notifications
- These surfaces are token-driven; verify active states, empty states, and avatars
  now render periwinkle/sage instead of indigo. Targeted tweaks only:
  - Saved list/detail cards → `rounded-2xl` + warm-white surface (tokens).
  - `SavedPlacesMap`/`AdventureMap` marker pins: replace any hardcoded indigo hex
    with the shared periwinkle const (extract `PRIMARY` to `src/lib/map/colors.ts`
    used by both MapView and maps in SavedPlaces/Adventures).
  - `NotificationsSheet`, `Profile` banner, `UserProfile` banner: swap any
    indigo/gradient accents for meadow tokens + edelweiss mark.
- Search: `SearchBar`/`PlacesSearch` focus rings/active item tint (tokens auto).

## Verification
1. `npm run lint` and `tsc` (or the repo's typecheck script) — no errors.
2. `netlify dev` and Playwright screenshots per `.agents/skills/dev-and-e2e-testing`:
   desktop (1280+) and mobile (390) for `/`, `/login`, `/signup`, `/map`,
   `/saved-places`, `/adventures`, `/profile`, `/friends`.
3. Toggle dark mode on each and confirm the pine-green palette + contrast.
4. Manual check: cluster/point markers, popup, hero illustration, logo, favicon.

## Out of scope
- No feature/behavior changes; name "Venture" unchanged; no new dependencies
  (SVG marks inline; Nunito Sans via existing Google Fonts link pattern).
