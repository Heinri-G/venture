import { supabase } from './supabase/client';
import { createNotification } from './notifications';
import type { PlaceProvider } from './savedPlaces';
import type {
  Adventure,
  AdventureShareRow,
  AdventureVisibility,
  AdventureWithPlaces,
} from './adventures';

export interface FriendProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicAdventure {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  visibility: 'public';
  created_at: string;
  owner: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  adventure_places: Array<{
    order_index: number;
    saved_place_id: string;
    saved_place: {
      id: string;
      user_id: string;
      place_id: string;
      rating: number | null;
      notes: string | null;
      place: {
        id: string;
        provider: PlaceProvider | null;
        provider_place_id: string | null;
        icon: string | null;
        name: string;
        address: string | null;
        latitude: number;
        longitude: number;
        category: string | null;
        maps_url: string | null;
        created_at: string;
      };
    };
  }>;
}

const TOKEN_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LENGTH = 16;

/** Generates an obfuscated, URL-safe public token. */
export function generatePublicToken(): string {
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
  }
  return token;
}

/** Builds the shareable URL for a public adventure token. */
export function publicShareUrl(token: string): string {
  return `${window.location.origin}/adventures/public/${token}`;
}

/**
 * Whether the given user may edit the adventure. The DB (RLS) is the source of
 * truth; this mirrors the policy so the UI can show/hide edit controls.
 */
export function canEditAdventure(args: {
  adventure: Pick<
    Adventure,
    'owner_id' | 'visibility' | 'allow_collaboration'
  >;
  userId?: string;
  myGroupIds?: Set<string>;
  shares?: AdventureShareRow[];
}): boolean {
  const { adventure, userId, myGroupIds = new Set(), shares = [] } = args;
  if (!userId) return false;
  if (adventure.owner_id === userId) return true;
  if (adventure.visibility !== 'shared' || !adventure.allow_collaboration) {
    return false;
  }
  return shares.some(
    (share) =>
      share.can_edit &&
      ((share.shared_with_user_id != null && share.shared_with_user_id === userId) ||
        (share.shared_with_group_id != null &&
          myGroupIds.has(share.shared_with_group_id)))
  );
}

/** Fetches the user's accepted friends with their public profile info. */
export async function fetchFriends(
  userId: string
): Promise<{ data: FriendProfile[]; error?: string }> {
  const { data: rows, error } = await supabase
    .from('friends')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching friends:', error);
    return { data: [], error: error.message };
  }

  const friendIds = [
    ...new Set(
      (rows ?? []).map((row) =>
        row.requester_id === userId ? row.addressee_id : row.requester_id
      )
    ),
  ];

  if (friendIds.length === 0) return { data: [] };

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', friendIds);

  if (profileError) {
    console.error('Error fetching friend profiles:', profileError);
    return { data: [], error: profileError.message };
  }

  const byId = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      } as FriendProfile,
    ])
  );

  const friends = friendIds.map(
    (id) =>
      byId.get(id) ?? {
        id,
        display_name: 'Friend',
        avatar_url: null,
      }
  );

  return { data: friends };
}

/** Fetches the groups the user is a member of. */
export async function fetchMyGroups(
  userId: string
): Promise<{ data: GroupInfo[]; error?: string }> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups:group_id(id, name, description)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching groups:', error);
    return { data: [], error: error.message };
  }

  const groups = (data ?? []).flatMap((row) => row.groups ?? []);

  return { data: groups };
}

/** Fetches just the ids of the groups the user belongs to. */
export async function fetchMyGroupIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching group ids:', error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.group_id as string));
}

/** Fetches the existing share rows for an adventure (with names for display). */
export async function fetchAdventureShares(
  adventureId: string
): Promise<{ data: AdventureShareRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('adventure_shares')
    .select(
      `
      id, adventure_id, shared_with_user_id, shared_with_group_id, can_edit, created_at,
      shared_with_profile:shared_with_user_id(id, display_name, avatar_url),
      shared_with_group:shared_with_group_id(id, name)
      `
    )
    .eq('adventure_id', adventureId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching adventure shares:', error);
    return { data: [], error: error.message };
  }
  return { data: (data as unknown as AdventureShareRow[]) ?? [] };
}

/** Upserts shares for the given friends (re-sharing updates can_edit). */
export async function shareWithFriends(
  adventureId: string,
  friendIds: string[],
  canEdit: boolean
): Promise<{ error?: string }> {
  if (friendIds.length === 0) return {};

  const { data: existing } = await supabase
    .from('adventure_shares')
    .select('shared_with_user_id')
    .eq('adventure_id', adventureId);

  const alreadyShared = new Set(
    (existing ?? [])
      .map((row) => row.shared_with_user_id as string | null)
      .filter((id): id is string => Boolean(id))
  );
  const newFriendIds = friendIds.filter((id) => !alreadyShared.has(id));

  const shares = friendIds.map((friendId) => ({
    adventure_id: adventureId,
    shared_with_user_id: friendId,
    can_edit: canEdit,
  }));

  const { error } = await supabase
    .from('adventure_shares')
    .upsert(shares, { onConflict: 'adventure_id, shared_with_user_id' });

  if (error) {
    console.error('Error sharing with friends:', error);
    return { error: error.message };
  }

  if (newFriendIds.length > 0) {
    const { data: authData } = await supabase.auth.getUser();
    const actorId = authData.user?.id;
    if (actorId) {
      await Promise.all(
        newFriendIds.map((friendId) =>
          createNotification({
            userId: friendId,
            type: 'adventure_shared',
            actorId,
            entityId: adventureId,
          })
        )
      );
    }
  }
  return {};
}

/** Upserts shares for the given groups (re-sharing updates can_edit). */
export async function shareWithGroups(
  adventureId: string,
  groupIds: string[],
  canEdit: boolean
): Promise<{ error?: string }> {
  if (groupIds.length === 0) return {};

  const { data: existing } = await supabase
    .from('adventure_shares')
    .select('shared_with_group_id')
    .eq('adventure_id', adventureId);

  const alreadyShared = new Set(
    (existing ?? [])
      .map((row) => row.shared_with_group_id as string | null)
      .filter((id): id is string => Boolean(id))
  );
  const newGroupIds = groupIds.filter((id) => !alreadyShared.has(id));

  const shares = groupIds.map((groupId) => ({
    adventure_id: adventureId,
    shared_with_group_id: groupId,
    can_edit: canEdit,
  }));

  const { error } = await supabase
    .from('adventure_shares')
    .upsert(shares, { onConflict: 'adventure_id, shared_with_group_id' });

  if (error) {
    console.error('Error sharing with groups:', error);
    return { error: error.message };
  }

  if (newGroupIds.length > 0) {
    const { data: authData } = await supabase.auth.getUser();
    const actorId = authData.user?.id;
    if (actorId) {
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', newGroupIds);

      const memberIds = [
        ...new Set((groupMembers ?? []).map((row) => row.user_id as string)),
      ].filter((memberId) => memberId !== actorId);

      await Promise.all(
        memberIds.map((memberId) =>
          createNotification({
            userId: memberId,
            type: 'adventure_shared',
            actorId,
            entityId: adventureId,
          })
        )
      );
    }
  }
  return {};
}

/** Revokes a share row by id. */
export async function removeAdventureShare(
  shareId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('adventure_shares')
    .delete()
    .eq('id', shareId);

  if (error) {
    console.error('Error removing adventure share:', error);
    return { error: error.message };
  }
  return {};
}

/** Toggles the can_edit flag on an existing share row. */
export async function updateShareCanEdit(
  shareId: string,
  canEdit: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('adventure_shares')
    .update({ can_edit: canEdit })
    .eq('id', shareId);

  if (error) {
    console.error('Error updating share permission:', error);
    return { error: error.message };
  }
  return {};
}

/**
 * Updates the adventure's visibility, generating (or preserving) the public
 * token for public adventures and clearing it otherwise so a de-publicized
 * adventure's link is revoked.
 */
export async function updateAdventureVisibility(
  adventureId: string,
  visibility: AdventureVisibility,
  options: { regenerateToken?: boolean } = {}
): Promise<{ data?: Adventure; error?: string }> {
  let token: string | null = null;

  if (visibility === 'public') {
    const { data: existing } = await supabase
      .from('adventures')
      .select('public_link_token')
      .eq('id', adventureId)
      .maybeSingle();

    token =
      !options.regenerateToken && existing?.public_link_token
        ? existing.public_link_token
        : generatePublicToken();
  }

  const { data, error } = await supabase
    .from('adventures')
    .update({
      visibility,
      public_link_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adventureId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating adventure visibility:', error);
    return { error: error.message };
  }
  return { data: (data as Adventure) ?? undefined };
}

/** Fetches a public adventure by its obfuscated token (read-only, anon-safe). */
export async function fetchPublicAdventureByToken(
  publicToken: string
): Promise<{ data?: PublicAdventure; error?: string }> {
  const { data, error } = await supabase
    .from('adventures')
    .select(
      `
      id, owner_id, title, description, cover_photo_url, visibility, created_at,
      owner:owner_id(id, display_name, avatar_url),
      adventure_places(
        order_index, saved_place_id,
        saved_place:saved_places(
          id, user_id, place_id, rating, notes,
          place:places(
            id, provider, provider_place_id, icon, name, address, latitude, longitude,
            category, maps_url, created_at
          )
        )
      )
      `
    )
    .eq('public_link_token', publicToken)
    .eq('visibility', 'public')
    .maybeSingle();

  if (error) {
    console.error('Error fetching public adventure:', error);
    return { error: error.message };
  }
  if (!data) return { data: undefined };

  const adventure = data as unknown as PublicAdventure;
  adventure.adventure_places = (adventure.adventure_places ?? []).sort(
    (a, b) => a.order_index - b.order_index
  );
  return { data: adventure };
}

export interface AdventureCopySource {
  title: string;
  description: string | null;
  adventure_places: Array<{ saved_place_id: string; order_index: number }>;
}

/** Copies an adventure (metadata + linked places) to the given owner. */
export async function copyAdventure(
  source: AdventureCopySource,
  newOwnerId: string
): Promise<{ data?: Adventure; error?: string }> {
  const { data: created, error: createError } = await supabase
    .from('adventures')
    .insert({
      owner_id: newOwnerId,
      title: `Copy of ${source.title}`,
      description: source.description,
      cover_photo_url: null,
      visibility: 'private',
      allow_collaboration: false,
    })
    .select()
    .single();

  if (createError || !created) {
    console.error('Error copying adventure:', createError);
    return { error: createError?.message || 'Failed to copy adventure.' };
  }

  if (source.adventure_places.length > 0) {
    const rows = source.adventure_places.map((place) => ({
      adventure_id: created.id,
      saved_place_id: place.saved_place_id,
      order_index: place.order_index,
    }));
    const { error: linkError } = await supabase
      .from('adventure_places')
      .insert(rows);
    if (linkError) {
      console.error('Error copying adventure places:', linkError);
      return { error: linkError.message };
    }
  }

  return { data: created as Adventure };
}

/** Loads a full adventure (with places + shares) and its edit permissions. */
export async function loadAdventureWithAccess(
  adventureId: string,
  userId: string | undefined
): Promise<{
  data?: AdventureWithPlaces;
  canEdit: boolean;
  error?: string;
}> {
  const { data, error } = await (async () => {
    const { data: adventure, error: fetchError } =
      await supabase
        .from('adventures')
        .select(
          `
          id, owner_id, title, description, cover_photo_url,
          visibility, allow_collaboration, public_link_token, created_at, updated_at,
          adventure_places(
            id, adventure_id, saved_place_id, order_index,
            saved_place:saved_places(
              id, user_id, place_id, rating, notes, created_at, updated_at,
              place:places(
                id, provider, provider_place_id, icon, name, address, latitude, longitude,
                category, created_at
              )
            )
          ),
          adventure_shares(
            id, adventure_id, shared_with_user_id, shared_with_group_id, can_edit, created_at,
            shared_with_profile:shared_with_user_id(id, display_name, avatar_url),
            shared_with_group:shared_with_group_id(id, name)
          )
          `
        )
        .eq('id', adventureId)
        .maybeSingle();

    if (fetchError) return { data: undefined, error: fetchError.message };
    if (!adventure) return { data: undefined };
    const typed = adventure as unknown as AdventureWithPlaces;
    typed.adventure_places = (typed.adventure_places ?? []).sort(
      (a, b) => a.order_index - b.order_index
    );
    return { data: typed };
  })();

  if (error || !data) {
    return { data, canEdit: false, error };
  }

  const myGroupIds = userId ? await fetchMyGroupIds(userId) : new Set<string>();
  const canEdit = canEditAdventure({
    adventure: data,
    userId,
    myGroupIds,
    shares: data.adventure_shares ?? [],
  });

  return { data, canEdit };
}
