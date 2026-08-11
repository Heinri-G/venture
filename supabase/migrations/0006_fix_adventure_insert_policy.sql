-- =============================================
-- Fix: ensure adventures INSERT/DELETE policies exist
-- "Save to My Adventures" (copyAdventure) failed for a non-owner with:
--   ERROR: new row violates row-level security policy for table "adventures"
-- The INSERT policy defined in 0001 is missing (or broken) on the live DB.
-- DROP + CREATE is idempotent, so this self-heals regardless of prior state.
-- =============================================

DROP POLICY IF EXISTS "Users can insert own adventures" ON public.adventures;
CREATE POLICY "Users can insert own adventures" ON public.adventures
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own adventures" ON public.adventures;
CREATE POLICY "Users can delete own adventures" ON public.adventures
  FOR DELETE USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.adventures TO authenticated;
