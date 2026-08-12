-- =============================================
-- Task 8: Social Features — Friends & Groups
-- =============================================

-- Group avatars (stored in the `groups` storage bucket).
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================
-- PROFILES: trusted-circle viewing
-- Accepted friends and fellow group members can view each other's profiles so
-- private profiles stay private while friends/groups still render names,
-- avatars, and bios. Public profiles were already viewable by everyone; these
-- policies simply OR additional access in.
-- =============================================

CREATE POLICY "Friends can view each other's profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.friends f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = profiles.id AND f.addressee_id = auth.uid())
          OR (f.addressee_id = profiles.id AND f.requester_id = auth.uid())
        )
    )
  );

CREATE POLICY "Group members can view co-member profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = profiles.id
        AND public.user_is_group_member(gm.group_id)
    )
  );

-- =============================================
-- GROUPS: admin management
-- The membership checks delegate to the SECURITY DEFINER helper added in
-- migration 0004 so they do not recurse through the group_members SELECT
-- policy.
-- =============================================

CREATE POLICY "Group admins can edit groups" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups" ON public.groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- =============================================
-- GROUP MEMBERS: creation, admin management, leaving
-- The creator inserts their own admin row while creating the group; afterwards
-- only existing admins can add members. Members can always delete their own
-- row (leave), and admins can remove anyone.
-- =============================================

CREATE POLICY "Creators can add self and admins can add members" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can update members" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Members can leave and admins can remove members" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- =============================================
-- NOTIFICATIONS (lightweight social center)
-- Actors create notifications for recipients; recipients can view and mark
-- them read.
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'adventure_shared', 'group_invite')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Actors can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

-- Include notifications in the realtime publication (no-op if the table is
-- already a member or the publication is absent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime'
      AND pr.prrelid = 'public.notifications'::regclass
  ) THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
