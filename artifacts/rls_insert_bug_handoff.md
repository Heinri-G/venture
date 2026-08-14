# RESOLVED: RLS insert bug blocking "Save to My Adventures"

## Status: FIXED & VERIFIED (2026-08-12)

## Root cause (confirmed by reproduction)
The `adventures` SELECT policy called `public.adventure_visible_to_user(id)` — a
SECURITY DEFINER function that internally runs `SELECT 1 FROM public.adventures
WHERE id = ...`. PostgreSQL applies the SELECT policy to the rows produced by
`INSERT/UPDATE ... RETURNING`, and that same-table subquery **cannot see the
just-written row** within the same command's snapshot, so the helper returns
false, the returned row is filtered, and Postgres raises
`new row violates row-level security policy for table "adventures"`.

Repro matrix (as user2, fresh JWT):
- `adventures` INSERT `return=minimal` (no RETURNING) -> **201 OK**
- `adventures` INSERT `return=representation` (RETURNING, what `.select()` does) -> **403 RLS**
- `saved_places` INSERT in both modes -> **409 unique-key** (RLS passed; only the
  unique constraint blocked) because its SELECT policy is column-based
  (`user_id = auth.uid() OR ...`), no same-table subquery.

Affected app flows (all use `.select()` on `adventures`): `copyAdventure`
(adventureSharing.ts:392), `createAdventure` (adventures.ts:176),
`updateAdventure` (adventures.ts:228), `updateAdventureVisibility`
(adventureSharing.ts:324).

## Fix
Migration `supabase/migrations/0007_fix_adventures_rls_returning.sql`: inlines the
visibility/editable expressions into the adventures SELECT + UPDATE policies using
the row's own columns (`owner_id`, `visibility`, `allow_collaboration`) plus
subqueries into `adventure_shares`/`group_members` only. `supabase/schema.sql`
synced. The SECURITY DEFINER helpers remain in place for `adventure_places`,
`saved_places`, and `adventure_shares` policies (they reference already-existing
parent adventure rows, so they do not suffer the same-table visibility problem).

## Verification (all green)
- Repro script `scripts/repro_rls.js`: adventures INSERT `return=representation`
  now returns **201** with full row; self-cleans test rows.
- `npx tsc --noEmit` clean; `npm run lint` 0 errors (3 pre-existing ui/ warnings);
  `npm run build` succeeds.
- Browser E2E (Playwright, user2): sign-in, open
  `/adventures/public/BGyWdKoeBSXAglKi`, click "Save to My Adventures" -> lands on
  `/adventures/<new-id>/edit` with title "Copy of Cover Photo Test". 0 console errors.

## Housekeeping remaining
- Drop diagnostic functions (created ad-hoc in SQL editor, not in migrations):
  ```sql
  DROP FUNCTION IF EXISTS public.debug_insert_adventure();
  DROP FUNCTION IF EXISTS public.debug_insert_saved_place();
  ```
- Note: user2 is a local test account; its password is a dev-only secret set via the admin API (see `scripts/repro_rls.js`, which reads `TEST_USER2_PASSWORD` from the environment).
- Optional cleanup of older diagnostic rows in `adventures` (titles: `sql editor test`,
  `direct test`, `rpc debug`, `diag own`, `repro direct`).
- NOTE: the investigation framing ("function context is the differentiator") was a
  red herring — the production failure is a plain PostgREST INSERT with RETURNING,
  no function involved. The function tests only ever inserted into `adventures`,
  so they never isolated function-vs-table as a variable.

