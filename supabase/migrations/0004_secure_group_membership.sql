-- =============================================
-- Task 7 follow-up: fix infinite RLS recursion on groups
-- The group_members SELECT policy self-referenced group_members, and the
-- groups SELECT policy referenced group_members. Once adventure sharing queried
-- group membership (share modal / fetchMyGroups / fetchMyGroupIds), Postgres
-- raised "infinite recursion detected in policy for relation group_members".
-- Both policies now delegate membership checks to a SECURITY DEFINER helper,
-- which bypasses RLS and only answers "is auth.uid() in this group?".
-- =============================================

CREATE OR REPLACE FUNCTION public.user_is_group_member(target_group_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = target_group_id AND gm.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Group members can view groups" ON public.groups;
CREATE POLICY "Group members can view groups" ON public.groups
  FOR SELECT USING (public.user_is_group_member(id));

DROP POLICY IF EXISTS "Group members can view members" ON public.group_members;
CREATE POLICY "Group members can view members" ON public.group_members
  FOR SELECT USING (public.user_is_group_member(group_id));
