---
name: dev-and-e2e-testing
description: How to run, verify, and browser-test the Venture app locally (netlify dev, lint/tsc/build, Playwright conventions).
---

# Dev & E2E Testing Skill

## Run the App
- Use `npm run netlify:dev` and test at `http://localhost:8888`. Netlify dev proxies the functions in `netlify/functions/`.
- Plain `npm run dev` (Vite on `:5174`) does NOT serve Netlify Functions — do not test function-backed features there.

## Verify Before Done
Run all three; all must pass:
```bash
npm run lint
npx tsc --noEmit
npm run build
```
- Lint baseline: 3 pre-existing `react-refresh/only-export-components` warnings in `src/components/ui/badge.tsx`, `ui/button.tsx`, `ui/tabs.tsx`. Do not "fix" these; they are shared-constant exports in shadcn components. Only 0-error is required.
- `tsc --noEmit` must be clean (strict mode).

## React 18 + Radix Refs
- The project is React 18, so custom shadcn/Radix components that accept `ref` (e.g. `SheetOverlay`, `SheetContent`) must use `forwardRef` with `ElementRef<typeof RadixX>`. Without it the console logs "Function components cannot be given refs".

## Browser E2E (Playwright MCP)
- Test creds are user-provided (ask the user if you don't have them). Sign in at `http://localhost:8888/login` before testing authenticated flows.
- Typical flow (map + PlaceDetails sheet):
  1. Navigate to `/map`, fill the `Search places` combobox, wait for the `Search suggestions` listbox.
  2. Click an `option` → the place `Sheet` (dialog) opens.
  3. Assert sheet state via `playwright_browser_find` (button labels, `[pressed]`, counters like `51/500`).
  4. Check console for new errors after each interaction.
- Sheet lifecycle: Escape (or X / drag handle) closes it. After closing, the suggestions list is often gone — re-type the query to re-trigger it (wait for the option text to reappear, then click).
- Use `playwright_browser_wait_for` with `textGone`/`text` instead of fixed sleeps where possible.
- Distinguish stale errors from new ones: errors logged once from the initial page load (before a hot-reloaded fix) persist in the console session. A fixed query will not log fresh errors — new errors appear with the new request URL.
