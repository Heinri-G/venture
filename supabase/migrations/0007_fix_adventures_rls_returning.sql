-- =============================================
-- Fix: RLS rejects INSERT/UPDATE ... RETURNING on adventures
-- Symptom: "new row violates row-level security policy for table adventures"
-- on the app's copy/create/update flows (any supabase .insert()/.update()
-- chained with .select(), i.e. INSERT/UPDATE ... RETURNING), while a plain
-- INSERT (return=minimal) succeeds.
--
-- Root cause: the adventures SELECT policy called
--   public.adventure_visible_to_user(id)
-- a SECURITY DEFINER function that internally runs
--   SELECT 1 FROM public.adventures a WHERE a.id = target_adventure_id ...
-- PostgreSQL applies the SELECT policy to the rows produced by
-- INSERT ... RETURNING (and UPDATE ... RETURNING). That same-table subquery
-- cannot see the just-inserted/just-updated row within the same command's
-- snapshot, so the helper returns false, the returned row is filtered, and
-- Postgres raises the RLS error. saved_places was unaffected because its
-- SELECT policy is purely column-based (user_id = auth.uid() OR ...).
--
-- Fix: inline the visibility/editable expressions into the adventures
-- policies, evaluating owner_id/visibility/allow_collaboration directly
-- against the row (as saved_places does). The shared-branch subqueries only
-- reference adventure_shares / group_members, so they never suffer the
-- same-table visibility problem. The helpers stay in place for the other
-- tables (adventure_places, saved_places, adventure_shares) whose policies
-- reference an already-existing parent adventure.
-- =============================================

DROP POLICY IF EXISTS "Users can view accessible adventures" ON public.adventures;

CREATE POLICY "Users can view accessible adventures" ON public.adventures
  FOR SELECT USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'shared'
      AND (
        EXISTS (
          SELECT 1 FROM public.adventure_shares s
          WHERE s.adventure_id = adventures.id
            AND s.shared_with_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.adventure_shares s
          JOIN public.group_members gm ON gm.group_id = s.shared_with_group_id
          WHERE s.adventure_id = adventures.id
            AND gm.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update adventures they can edit" ON public.adventures;

CREATE POLICY "Users can update adventures they can edit" ON public.adventures
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR (
      visibility = 'shared'
      AND allow_collaboration
      AND (
        EXISTS (
          SELECT 1 FROM public.adventure_shares s
          WHERE s.adventure_id = adventures.id
            AND s.shared_with_user_id = auth.uid()
            AND s.can_edit
        )
        OR EXISTS (
          SELECT 1 FROM public.adventure_shares s
          JOIN public.group_members gm ON gm.group_id = s.shared_with_group_id
          WHERE s.adventure_id = adventures.id
            AND gm.user_id = auth.uid()
            AND s.can_edit
        )
      )
    )
  );
