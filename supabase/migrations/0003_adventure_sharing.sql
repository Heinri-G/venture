-- =============================================
-- Task 7: Adventure Sharing, Collaboration & Public Links
-- =============================================

-- Public share links are keyed by an opaque, unique token so the internal
-- adventure UUID is never exposed in the URL.
ALTER TABLE public.adventures ADD COLUMN IF NOT EXISTS public_link_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_adventures_public_link_token
  ON public.adventures(public_link_token);

-- Per-share granular edit permission (friends/groups can be granted "Can edit"
-- or left read-only). Effective edit access also requires the adventure's
-- allow_collaboration flag.
ALTER TABLE public.adventure_shares ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT false;

-- Back the upsert-based share flows used by the client.
CREATE UNIQUE INDEX IF NOT EXISTS adventure_shares_adventure_user_key
  ON public.adventure_shares(adventure_id, shared_with_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS adventure_shares_adventure_group_key
  ON public.adventure_shares(adventure_id, shared_with_group_id);

-- =============================================
-- RLS helper functions
-- SECURITY DEFINER so the policies can reason about shares/group membership
-- without recursing through the RLS policies on the referenced tables. They
-- only return booleans derived from auth.uid(), so no data can leak.
-- =============================================

CREATE OR REPLACE FUNCTION public.adventure_visible_to_user(target_adventure_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.adventures a
    WHERE a.id = target_adventure_id
      AND (
        a.owner_id = auth.uid()
        OR a.visibility = 'public'
        OR (
          a.visibility = 'shared'
          AND (
            EXISTS (
              SELECT 1 FROM public.adventure_shares s
              WHERE s.adventure_id = a.id
                AND s.shared_with_user_id = auth.uid()
            )
            OR EXISTS (
              SELECT 1 FROM public.adventure_shares s
              JOIN public.group_members gm ON gm.group_id = s.shared_with_group_id
              WHERE s.adventure_id = a.id
                AND gm.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.adventure_editable_by_user(target_adventure_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.adventures a
    WHERE a.id = target_adventure_id
      AND (
        a.owner_id = auth.uid()
        OR (
          a.visibility = 'shared'
          AND a.allow_collaboration
          AND (
            EXISTS (
              SELECT 1 FROM public.adventure_shares s
              WHERE s.adventure_id = a.id
                AND s.shared_with_user_id = auth.uid()
                AND s.can_edit
            )
            OR EXISTS (
              SELECT 1 FROM public.adventure_shares s
              JOIN public.group_members gm ON gm.group_id = s.shared_with_group_id
              WHERE s.adventure_id = a.id
                AND gm.user_id = auth.uid()
                AND s.can_edit
            )
          )
        )
      )
  );
$$;

-- =============================================
-- ADVENTURES policies
-- =============================================

DROP POLICY IF EXISTS "Users can view own or public adventures" ON public.adventures;
DROP POLICY IF EXISTS "Users can update own adventures" ON public.adventures;

CREATE POLICY "Users can view accessible adventures" ON public.adventures
  FOR SELECT USING (public.adventure_visible_to_user(id));

-- Owners always edit; shared collaborators can edit only when the adventure is
-- shared, allow_collaboration is on, and their share grants can_edit.
CREATE POLICY "Users can update adventures they can edit" ON public.adventures
  FOR UPDATE USING (public.adventure_editable_by_user(id));

-- =============================================
-- ADVENTURE PLACES policies
-- =============================================

DROP POLICY IF EXISTS "Users can view adventure places for accessible adventures" ON public.adventure_places;
DROP POLICY IF EXISTS "Users can insert to own adventures" ON public.adventure_places;
DROP POLICY IF EXISTS "Users can delete from own adventures" ON public.adventure_places;
DROP POLICY IF EXISTS "Users can update places in own adventures" ON public.adventure_places;

CREATE POLICY "Users can view adventure places for accessible adventures" ON public.adventure_places
  FOR SELECT USING (public.adventure_visible_to_user(adventure_id));

CREATE POLICY "Users can add places to adventures they can edit" ON public.adventure_places
  FOR INSERT WITH CHECK (public.adventure_editable_by_user(adventure_id));

CREATE POLICY "Users can update places in adventures they can edit" ON public.adventure_places
  FOR UPDATE USING (public.adventure_editable_by_user(adventure_id));

CREATE POLICY "Users can remove places from adventures they can edit" ON public.adventure_places
  FOR DELETE USING (public.adventure_editable_by_user(adventure_id));

-- =============================================
-- ADVENTURE SHARES policies
-- =============================================

DROP POLICY IF EXISTS "Users can view shares involving them" ON public.adventure_shares;
DROP POLICY IF EXISTS "Adventure owners can share" ON public.adventure_shares;

CREATE POLICY "Users can view shares of adventures they can access" ON public.adventure_shares
  FOR SELECT USING (public.adventure_visible_to_user(adventure_id));

CREATE POLICY "Adventure owners can share" ON public.adventure_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Adventure owners can update shares" ON public.adventure_shares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Adventure owners can remove shares" ON public.adventure_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

-- =============================================
-- SAVED PLACES policies
-- Saved places stay private to their owner, but rows that back an accessible
-- adventure's places must be readable so shared/public adventures can render
-- their place details (and copied adventures keep their linked places).
-- =============================================

DROP POLICY IF EXISTS "Users can view own saved places" ON public.saved_places;

CREATE POLICY "Users can view own saved places" ON public.saved_places
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.adventure_places ap
      JOIN public.adventures a ON a.id = ap.adventure_id
      WHERE ap.saved_place_id = saved_places.id
        AND public.adventure_visible_to_user(a.id)
    )
  );

-- =============================================
-- PROFILES policies
-- Owners of public adventures stay identifiable on the public view page even
-- if they chose a private profile elsewhere.
-- =============================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (
    is_public = true
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.owner_id = profiles.id
        AND a.visibility = 'public'
    )
  );

-- =============================================
-- GRANTS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.adventure_shares TO authenticated;
