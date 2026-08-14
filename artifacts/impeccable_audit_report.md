# Venture — Impeccable Audit Report

Date: 2026-08-13
Platform: web · Vite + React 18 + Tailwind v4 + shadcn/ui · Detector: 2 findings (1 advisory, 1 warning) · Scope: whole project

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Missing `lang`; primary search unlabeled; no reduced-motion |
| 2 | Performance | 3/4 | No route splitting; render-blocking fonts; heavy blur layers |
| 3 | Responsive Design | 3/4 | Touch targets systemically <44px |
| 4 | Theming | 3/4 | Hard-coded map colors + rgba shadows; theme FOUC |
| 5 | Implementation Integrity | 3/4 | Placeholder marketing stats; detector findings minor |
| **Total** | | **14/20** | **Good — address weak dimensions** |

## Implementation Integrity Verdict

**Pass.** The app expresses a coherent, product-specific system — adventures with routed maps + shared place ordering, saved places, friends/groups, granular visibility and collaboration — not an interchangeable template. Both detector findings verified in context and found minor:

- `codex-grid-background` (advisory) — `src/globals.css:160` `@utility bg-grid`, used at `Layout.tsx:73` and `AuthShell.tsx:22`. Verified: 48px grid at 4% opacity with gradient masks. Restrained and on-theme; the flag is accurate but low-impact.
- `overused-font` (warning) — `index.html:9`. Verified: Inter is both `--font-sans` and `--font-heading` (`globals.css:85-86`); no display font.

## Executive Summary

- **Audit Health Score: 14/20 (Good)** — solid foundation; the gaps are concentrated and fixable before launch.
- **Issues: 0 P0 · 5 P1 · 10 P2 · 5 P3**
- **Top issues:** WCAG A violation (`lang`), unlabeled home search with no combobox semantics, no reduced-motion handling, misleading home statistics, theme flash of light mode for dark users.
- **Next steps:** close the a11y gaps (search, lang, motion), then tokenize map/shadows and slim the bundle.

## Detailed Findings by Severity

### P1 — Fix before release

1. **Missing document language** — `index.html:2`
   - Category: Accessibility · WCAG 3.1.1 (Level A)
   - Impact: screen readers assume the default language and mispronounce the entire app; a hard WCAG A failure.
   - Recommendation: `<html lang="en">`.
   - Suggested command: `/impeccable adapt`

2. **Home search input unlabeled, no combobox pattern** — `src/components/search/SearchBar.tsx:71-78,127-177`
   - Category: Accessibility · WCAG 1.3.1 / 4.1.2
   - Impact: keyboard users can't operate the primary search (no arrow-key nav, no role/listbox/`aria-selected`), and screen readers announce a bare text field. The map's `PlacesSearch.tsx:171-268` already implements the full, correct pattern — this one regressed against it.
   - Recommendation: add `aria-label`, `role="combobox"` + `aria-expanded`/`aria-activedescendant`, listbox/option roles, and keyboard selection — copy `PlacesSearch`.
   - Suggested command: `/impeccable adapt`

3. **No `prefers-reduced-motion` handling** — `src/components/PageTransition.tsx`, `Home.tsx:97-222`, map `flyTo` 1200–1500ms (`MapView.tsx:339-343`, `AdventureMap.tsx:81`, `SavedPlacesMap.tsx:74`)
   - Category: Accessibility · WCAG 2.3.3 (motion sensitivity)
   - Impact: full-page translate+fade on every navigation plus long camera flights with no off-switch; vestibular-sensitive users get no relief.
   - Recommendation: `motion-reduce:` variants / `useReducedMotion()`; shorten flyTo when reduced motion is set.
   - Suggested command: `/impeccable adapt`

4. **Misleading marketing statistics on Home** — `src/Home.tsx:28-32` ("10k+ places", "120+ countries", "4.9★ curated quality")
   - Category: Implementation Integrity
   - Impact: fabricated metrics presented as real platform data — the single most "template-y" artifact in the app and a trust/review risk at launch.
   - Recommendation: replace with honest copy or real figures (see PRODUCT.md note).
   - Suggested command: `/impeccable clarify`

5. **Theme flash (FOUC) for dark-mode users** — `index.html` (no inline theme script; `next-themes` `attribute="class"`, `defaultTheme="system"` in `main.tsx`)
   - Category: Theming
   - Impact: light theme flashes before hydration on every load for dark/system users.
   - Recommendation: add next-themes' init `<script>` in `<head>`.
   - Suggested command: `/impeccable adapt`

### P2 — Next pass

6. **`text-muted-foreground/70` fails contrast** — `src/Friends.tsx:42` ("No bio", 12px) at **3.13:1** (light) / **4.07:1** (dark) vs 4.5:1 required. WCAG 1.4.3.
7. **Unrated star buttons below non-text contrast** — `SavedPlaceDetails.tsx:258`, plus unrated display stars in `AdventureDetail.tsx:91`, `SavedPlacesList.tsx:33`, `PlaceDetails.tsx:404`, `AdventurePublicView.tsx:51` at `text-muted-foreground/30` = **1.54:1** (light) / **1.67:1** (dark). WCAG 1.4.11 (3:1). Note: the *rating buttons* in SavedPlaceDetails are interactive controls — this one genuinely fails.
8. **Switches without accessible names** — `AdventureCreationForm.tsx` (visibility toggle) and `Profile.tsx` (public-profile switch); unnamed `role="switch"`. WCAG 4.1.2. (`ShareAdventureModal.tsx:499-504,660-668,822-829` shows the correct pattern.)
9. **Friends search input placeholder-only** — `src/Friends.tsx:332-337`; no `aria-label`. WCAG 1.3.1.
10. **Systemic sub-44px touch targets** — `SearchBar.tsx:117` h-7 chips (~28px), `SearchBar.tsx:167`/`SavedPlacesList.tsx:114`/`AdventureDetail.tsx:657` h-4 badges, `AdventureDetail.tsx:129` size-8 reorder handle, `icon-sm` buttons, h-9 inputs. WCAG 2.5.8 (24px min AA) / 44px best practice.
11. **Hard-coded map colors drift from tokens** — `MapView.tsx:40` & `SavedPlacesMap.tsx:23` `#5450e6`, `AdventureMap.tsx:31` `#4f46e5`, plus `#ffffff` strokes — two different indigos, neither is the `--primary` token `oklch(0.53 0.22 277)`.
12. **Hard-coded rgba shadows** — `SearchBar.tsx:69,134`, `PlacesSearch.tsx:169,217` — don't adapt to dark mode.
13. **No route-level code splitting** — `src/App.tsx:1-19` eager-imports every page; MapLibre GL ships in the entry chunk on *every* route, including `/login`.
14. **Render-blocking external font stylesheet** — `index.html:9` Google Fonts CSS in `<head>`.
15. **Hidden scrollbar on chip rows** — `SearchBar.tsx:104` `no-scrollbar` — swipe-affordance invisible on mobile.

### P3 — Polish

16. **Large `blur-3xl` decorative layers** — `Layout.tsx:74-76`, `AuthShell.tsx:23-25` — fixed paint/memory cost on mobile GPUs.
17. **`effectivePageSize: 1000`** client-side fetch+sort in `SavedPlaces.tsx`.
18. **`DEMO_MARKERS` fallback ships** — `MapView.tsx:47-51` dev scaffolding.
19. **`text-[10px]` micro badges** — readability floor.
20. **Map markers not keyboard-focusable** — mitigated by the list fallback in AdventureDetail/SavedPlaces.

## Patterns & Systemic Issues

- **Two search implementations with divergent a11y** — `PlacesSearch` (model combobox) vs header `SearchBar` (no semantics). Fix `SearchBar` to parity or unify.
- **Placeholder-only inputs recur** (SearchBar, Friends search) while well-labeled inputs recur elsewhere — labeling inconsistency.
- **Map paint colors hard-coded in all three map components**, and literal shadows in both search components — a theming token gap, not one-offs.
- **Touch targets consistently small across the mobile-first experience.**

## Positive Findings

- **Token system verified numerically**: foreground 17.7:1, white-on-primary 5.57:1, muted-foreground 5.77:1 on background, 6.03:1 on card — all pass AA in light and dark. Dark primary pairs correctly with dark foreground (5.77:1).
- **`PlacesSearch` is a reference-quality combobox** (roles, `aria-activedescendant`, `aria-selected`, Escape/click-outside, keyboard nav).
- **Forms are exemplary**: Login/Signup fully labeled with autocomplete; `ShareAdventureModal` radiogroup + `aria-pressed` toggles + labeled switches + `role="alert"` errors.
- **Maps are theme-flip aware** (`useMapLibre.ts` style-metadata guard), worker URL correctly handled for Vite, clustered, `memo()`'d, with skeleton fallbacks everywhere.
- `RatingStars` use `role="img"` + `aria-label`; notifications announce unread counts (`aria-live`); destructive actions gated behind `AlertDialog`.

## Recommended Actions

1. **[P1] `/impeccable adapt`**: `lang="en"`, label + combobox semantics for the header SearchBar, reduced-motion handling, theme FOUC init script, contrast fixes on `/70` and `/30` muted-foreground.
2. **[P1] `/impeccable clarify`**: replace placeholder Home statistics with honest copy.
3. **[P2] `/impeccable colorize`**: map colors and search shadows into theme tokens; dark-mode-safe shadow tokens.
4. **[P2] `/impeccable optimize`**: route-level lazy loading (MapLibre out of the entry chunk), font loading, remove/lighten `blur-3xl` layers.
5. **[P2] `/impeccable layout`**: touch-target pass (≥44px) across chips, badges, icon buttons.
6. **[P3] `/impeccable polish`**: final sweep — remove `DEMO_MARKERS`, `text-[10px]` badges, scrollbar-hidden chips.