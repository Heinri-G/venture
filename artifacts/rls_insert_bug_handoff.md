# Handoff: RLS insert bug blocking "Save to My Adventures"

## Situation
Task 7 (adventure sharing / public links) is built and mostly verified, but the non-owner **copy/save flow is blocked**: `copyAdventure()` in `src/lib/adventureSharing.ts:388` inserts into `public.adventures` with `owner_id = auth.uid()` and gets `403 42501 "new row violates row-level security policy for table adventures"`. App code is correct (verified request body + JWT both carry user2's id). The bug is at the database level.

## Verified facts
- **App**: Vite + Netlify dev at `http://localhost:8888`; Supabase project `mxtwkwhidqxpcjmjferw`. Only **one** `adventures` table (`public.adventures`, relkind `r`), **zero** triggers on it.
- **Users**: owner = `venture.test.user@example.com` ("Adventurer"); copier = `venture.test.user2@example.com` ("Second Tester", created via admin API with `email_confirm: true`, id `a140b172-d461-4f56-bf22-08afd19c05d5`). Signup is email-confirmed — create test users via `supabase.auth.admin.createUser` with `email_confirm: true`, not the UI.
- **Public adventure**: token `BGyWdKoeBSXAglKi`, adventure id `ad7c0090-d289-4b4b-9ce5-1f73579256b0`. Public/anonymous view, owner view, and share-modal flows all verified working earlier.
- **Policy exists and is correct**: `pg_policy` shows INSERT policy "Users can insert own adventures", `polcmd='a'`, `with_check = (owner_id = auth.uid())`, roles {public}. Migration `supabase/migrations/0006_fix_adventure_insert_policy.sql` recreates it (applied).
- **`auth.uid()` works via REST**: raw REST INSERT into `saved_places` with `user_id`=user2 succeeds (201); with another user fails RLS (403). RPC diagnostic shows `auth.uid()` = user2 id with full claims GUC present.
- **Top-level SQL works**: `SET ROLE authenticated; set_config('request.jwt.claims', '{...sub:user2...}', false); INSERT INTO adventures(owner_id=user2...)` -> **succeeds** (`inserted=1`).
- **PL/pgSQL function context fails**: an RPC (SECURITY INVOKER) doing the identical insert **fails RLS** — both inside a `BEGIN...EXCEPTION` subtransaction AND in the plain function body. `auth.uid()` = user2 and claims GUC are visible inside the subtransaction too (`uid_inner` = user2), ruling out GUC-visibility/subtransaction theories.
- RLS is evaluated by PostgreSQL, not PostgREST, and `NOTIFY pgrst, 'reload schema'` did not help — stale-cache theory is dead.

## The paradox to solve
Same logical insert (role `authenticated`, `auth.uid()` = user2, `owner_id` = user2, correct permissive policy) **passes at top-level SQL but fails inside a PL/pgSQL function**. The function context is the differentiator.

## In-flight diagnostic (not yet confirmed)
The last SQL batch sent to the user was to update `public.debug_insert_adventure()` to return `(uid, current_user_role, session_user, check_eval, insert_ok, insert_err)` and to check `pg_rewrite` for rules on `public.adventures`. **This has NOT been run/confirmed yet.** The user switched off — the next agent should ask them to run it.

```sql
DROP FUNCTION public.debug_insert_adventure();
CREATE OR REPLACE FUNCTION public.debug_insert_adventure()
RETURNS TABLE (uid uuid, current_user_role text, session_role text, check_eval boolean, insert_ok boolean, insert_err text)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE v_uid uuid; v_cu text; v_su text; v_check boolean; v_ok boolean := false; v_err text := NULL; new_id uuid;
BEGIN
  v_uid := auth.uid();
  v_cu := current_user::text;
  v_su := session_user::text;
  v_check := ('a140b172-d461-4f56-bf22-08afd19c05d5'::uuid = auth.uid());
  BEGIN
    INSERT INTO public.adventures (owner_id, title, visibility, allow_collaboration)
    VALUES (v_uid, 'rpc dbg', 'private', false)
    RETURNING id INTO new_id;
    v_ok := true;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  IF new_id IS NOT NULL THEN DELETE FROM public.adventures WHERE id = new_id; END IF;
  RETURN QUERY SELECT v_uid, v_cu, v_su, v_check, v_ok, v_err;
END $$;
GRANT EXECUTE ON FUNCTION public.debug_insert_adventure() TO authenticated, anon;
SELECT rulename, pg_get_ruledef(oid) AS ruledef FROM pg_rewrite WHERE ev_class = 'public.adventures'::regclass;
```

Then call it over REST with a fresh user2 token:
`POST {url}/rest/v1/rpc/debug_insert_adventure` with headers `apikey` + `Authorization: Bearer <fresh token>` (tokens expire hourly; refresh from browser localStorage key `sb-mxtwkwhidqxpcjmjferw-auth-token`, or re-login).

## Likely leads (in order)
1. **Rewrite rules** on `public.adventures` (`pg_rewrite`) — INSTEAD rules could redirect the function-context insert. Check the rules output above.
2. **Role in function context** — `current_user`/`session_user` output may reveal PostgREST runs SECURITY INVOKER RPCs as a different role (e.g., `authenticator`); that would change which policies apply. Compare with top-level test.
3. If both come back normal, add `current_setting('search_path')` and a `SET LOCAL role` variant to the diagnostic to find the remaining difference; also try `SECURITY DEFINER` on the RPC to see if it changes the outcome.

## Cleanup & housekeeping
- Drop `public.debug_insert_adventure()` once diagnosis is done.
- Verify no leftover test rows in `adventures` (titles: `sql editor test`, `direct test`, `rpc debug`, `diag own`).
- `supabase/schema.sql` already matches (INSERT/DELETE policies present) — no doc change needed unless the fix alters policies.
- Do NOT change app code until the DB root cause is found; `copyAdventure` is verified correct.
- Final verification before wrapping: `npx tsc --noEmit`, `npm run lint`, `npm run build`, then re-run the non-owner save E2E at `/adventures/public/BGyWdKoeBSXAglKi` as user2.
