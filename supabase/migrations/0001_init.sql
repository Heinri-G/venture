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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
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

-- Profiles: Users can read public profiles, update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (is_public = true OR id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Places: Anyone (including logged-out visitors) can read places, authenticated users can insert
CREATE POLICY "Places are viewable by everyone" ON public.places
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert places" ON public.places
  FOR INSERT TO authenticated WITH CHECK (true);

-- Saved Places: Users can only CRUD their own
CREATE POLICY "Users can view own saved places" ON public.saved_places
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved places" ON public.saved_places
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved places" ON public.saved_places
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own saved places" ON public.saved_places
  FOR DELETE USING (user_id = auth.uid());

-- Adventures: Owner can do everything, public ones are readable
CREATE POLICY "Users can view own or public adventures" ON public.adventures
  FOR SELECT USING (
    owner_id = auth.uid()
    OR visibility = 'public'
  );

CREATE POLICY "Users can insert own adventures" ON public.adventures
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own adventures" ON public.adventures
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own adventures" ON public.adventures
  FOR DELETE USING (owner_id = auth.uid());

-- Adventure Places: Based on adventure ownership
CREATE POLICY "Users can view adventure places for accessible adventures" ON public.adventure_places
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id
      AND (a.owner_id = auth.uid() OR a.visibility = 'public')
    )
  );

CREATE POLICY "Users can insert to own adventures" ON public.adventure_places
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from own adventures" ON public.adventure_places
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

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
CREATE POLICY "Group members can view groups" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Group Members: Members can view co-members
CREATE POLICY "Group members can view members" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

-- Adventure Shares: Participants can view
CREATE POLICY "Users can view shares involving them" ON public.adventure_shares
  FOR SELECT USING (
    shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Adventure owners can share" ON public.adventure_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_saved_places_user ON public.saved_places(user_id);
CREATE INDEX idx_adventures_owner ON public.adventures(owner_id);
CREATE INDEX idx_adventure_places_adventure ON public.adventure_places(adventure_id);
CREATE INDEX idx_friends_users ON public.friends(requester_id, addressee_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_places_foursquare ON public.places(foursquare_fsq_id);

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
GRANT SELECT, INSERT, DELETE ON public.adventure_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT ON public.adventure_shares TO authenticated;
