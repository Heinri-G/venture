-- =============================================
-- Venture (Wanderlust) Database Schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS (extends Supabase auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'Adventurer'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PLACES (canonical place data from Foursquare)
-- =============================================
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foursquare_fsq_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  category TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SAVED PLACES (user's personal saves with notes)
-- =============================================
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  notes TEXT,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- =============================================
-- ADVENTURES (collections of saved places)
-- =============================================
CREATE TABLE public.adventures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  allow_collaboration BOOLEAN DEFAULT false,
  public_link_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADVENTURE PLACES (join table with ordering)
-- =============================================
CREATE TABLE public.adventure_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adventure_id UUID NOT NULL REFERENCES public.adventures(id) ON DELETE CASCADE,
  saved_place_id UUID NOT NULL REFERENCES public.saved_places(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(adventure_id, saved_place_id)
);

-- =============================================
-- FRIENDS
-- =============================================
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- =============================================
-- GROUPS
-- =============================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- =============================================
-- ADVENTURE SHARING (share with friends/groups)
-- =============================================
CREATE TABLE public.adventure_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adventure_id UUID NOT NULL REFERENCES public.adventures(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  ),
  UNIQUE(adventure_id, shared_with_user_id),
  UNIQUE(adventure_id, shared_with_group_id)
);

-- =============================================
-- NOTIFICATIONS (lightweight social center)
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'adventure_shared', 'group_invite')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adventure_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adventure_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS helper functions
-- SECURITY DEFINER so policies can reason about shares/group membership without
-- recursing through RLS on the referenced tables. They only return booleans
-- derived from auth.uid(), so no data can leak.
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

-- Profiles: Users can read public profiles, update their own.
-- Owners of public adventures stay identifiable on the public view page even
-- if they chose a private profile elsewhere.
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

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Trusted circles can view each other's profiles even when private, so friends
-- and groups render names/avatars/bios for their members.
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

-- Places: Anyone (including logged-out visitors) can read places, authenticated users can insert
CREATE POLICY "Places are viewable by everyone" ON public.places
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert places" ON public.places
  FOR INSERT TO authenticated WITH CHECK (true);

-- Saved Places: Users can CRUD their own. Rows that back an accessible
-- adventure's places must be readable so shared/public adventures render their
-- place details, and copied adventures keep their linked places.
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

CREATE POLICY "Users can insert own saved places" ON public.saved_places
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved places" ON public.saved_places
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own saved places" ON public.saved_places
  FOR DELETE USING (user_id = auth.uid());

-- Adventures: Owner can do everything, public/shared ones are readable
-- NOTE: these are inlined (not calling adventure_visible_to_user/editable_by_user)
-- because those helpers query public.adventures and therefore fail RLS on
-- INSERT/UPDATE ... RETURNING (the subquery cannot see the just-written row).
-- See migration 0007 for details.
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

CREATE POLICY "Users can insert own adventures" ON public.adventures
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Owners always edit; shared collaborators edit only when the adventure is
-- shared, allow_collaboration is on, and their share grants can_edit.
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

CREATE POLICY "Users can delete own adventures" ON public.adventures
  FOR DELETE USING (owner_id = auth.uid());

-- Adventure Places: Based on adventure visibility/edit access
CREATE POLICY "Users can view adventure places for accessible adventures" ON public.adventure_places
  FOR SELECT USING (public.adventure_visible_to_user(adventure_id));

CREATE POLICY "Users can add places to adventures they can edit" ON public.adventure_places
  FOR INSERT WITH CHECK (public.adventure_editable_by_user(adventure_id));

CREATE POLICY "Users can remove places from adventures they can edit" ON public.adventure_places
  FOR DELETE USING (public.adventure_editable_by_user(adventure_id));

CREATE POLICY "Users can update places in adventures they can edit" ON public.adventure_places
  FOR UPDATE USING (public.adventure_editable_by_user(adventure_id));

-- Friends: Both parties can view, requester can insert/update
CREATE POLICY "Users can view own friendships" ON public.friends
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can send friend requests" ON public.friends
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Addressee can update friend request" ON public.friends
  FOR UPDATE USING (addressee_id = auth.uid());

CREATE POLICY "Either party can delete friendship" ON public.friends
  FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Groups: Members can view, creator is admin
-- Membership is checked via a SECURITY DEFINER helper so the policy does not
-- recurse through the group_members RLS policy (which would otherwise trigger
-- "infinite recursion detected in policy").
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

CREATE POLICY "Group members can view groups" ON public.groups
  FOR SELECT USING (public.user_is_group_member(id));

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

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

-- Group Members: Members can view co-members
CREATE POLICY "Group members can view members" ON public.group_members
  FOR SELECT USING (public.user_is_group_member(group_id));

-- The creator inserts their own admin row while creating the group; afterwards
-- only existing admins can add members.
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

-- Members can always delete their own row (leave); admins can remove anyone.
CREATE POLICY "Members can leave and admins can remove members" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- Adventure Shares: Owner can manage, anyone with access can view
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

-- Notifications: actors create them, recipients view/update them
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Actors can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_saved_places_user ON public.saved_places(user_id);
CREATE INDEX idx_adventures_owner ON public.adventures(owner_id);
CREATE INDEX idx_adventures_public_link_token ON public.adventures(public_link_token);
CREATE INDEX idx_adventure_places_adventure ON public.adventure_places(adventure_id);
CREATE INDEX idx_friends_users ON public.friends(requester_id, addressee_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_places_foursquare ON public.places(foursquare_fsq_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- =============================================
-- TABLE GRANTS (roles need privileges on top of RLS)
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.places TO anon, authenticated;
GRANT INSERT ON public.places TO authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adventures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adventure_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adventure_shares TO authenticated;

-- Anonymous visitors need read access to render public adventure links. RLS
-- ("adventure_visible_to_user") still limits anon to public adventures and
-- their linked places; these grants only unlock the tables.
GRANT SELECT ON public.adventures TO anon;
GRANT SELECT ON public.adventure_places TO anon;
GRANT SELECT ON public.saved_places TO anon;

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
