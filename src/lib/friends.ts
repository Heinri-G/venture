import { supabase } from './supabase/client';
import { createNotification } from './notifications';

export interface ProfileSummary {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type FriendStatus =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends';

export interface FriendRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  requester?: ProfileSummary | null;
  addressee?: ProfileSummary | null;
}

export interface AcceptedFriend {
  id: string; // friendship row id (used to remove)
  requester_id: string;
  addressee_id: string;
  friend: ProfileSummary;
}

export interface FriendsPageData {
  incoming: FriendRow[];
  outgoing: FriendRow[];
  friends: AcceptedFriend[];
}

/**
 * Resolves the relationship between the current user and a target profile
 * from the full set of friendship rows. Pure helper used by the UI.
 */
export function getFriendStatus(
  userId: string,
  targetUserId: string,
  friendships: Pick<FriendRow, 'requester_id' | 'addressee_id' | 'status'>[]
): FriendStatus {
  for (const f of friendships) {
    if (f.requester_id === userId && f.addressee_id === targetUserId) {
      return f.status === 'accepted' ? 'friends' : 'pending_outgoing';
    }
    if (f.requester_id === targetUserId && f.addressee_id === userId) {
      return f.status === 'accepted' ? 'friends' : 'pending_incoming';
    }
  }
  return 'none';
}

/** Fetches every friendship row involving the user (for status lookups). */
export async function fetchFriendshipsForUser(
  userId: string
): Promise<{ data: FriendRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id, requester_id, addressee_id, status, created_at,
      requester:requester_id(id, display_name, avatar_url, bio, is_public),
      addressee:addressee_id(id, display_name, avatar_url, bio, is_public)
      `
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching friendships:', error);
    return { data: [], error: error.message };
  }
  return { data: (data as unknown as FriendRow[]) ?? [] };
}

/** Fetches incoming + outgoing requests and accepted friends in one call. */
export async function fetchFriendsPageData(
  userId: string
): Promise<{ data?: FriendsPageData; error?: string }> {
  const { data: rows, error } = await fetchFriendshipsForUser(userId);
  if (error) return { error };

  const incoming = rows.filter(
    (row) => row.status === 'pending' && row.addressee_id === userId
  );
  const outgoing = rows.filter(
    (row) => row.status === 'pending' && row.requester_id === userId
  );
  const friends: AcceptedFriend[] = rows
    .filter((row) => row.status === 'accepted')
    .map((row) => ({
      id: row.id,
      requester_id: row.requester_id,
      addressee_id: row.addressee_id,
      friend:
        row.requester_id === userId
          ? (row.addressee as ProfileSummary)
          : (row.requester as ProfileSummary),
    }))
    .filter((entry) => Boolean(entry.friend));

  return { data: { incoming, outgoing, friends } };
}

/** Sends a friend request and notifies the addressee. */
export async function sendFriendRequest(
  userId: string,
  targetUserId: string
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from('friends')
    .insert({
      requester_id: userId,
      addressee_id: targetUserId,
      status: 'pending',
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Error sending friend request:', error);
    return { error: error.message };
  }

  await createNotification({
    userId: targetUserId,
    type: 'friend_request',
    actorId: userId,
    entityId: data?.id ?? null,
  });
  return {};
}

/** Accepts or declines a pending request, notifying the requester on accept. */
export async function respondToFriendRequest(
  requestId: string,
  status: 'accepted' | 'declined',
  options: { actorUserId: string; requesterId: string }
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friends')
    .update({ status })
    .eq('id', requestId);

  if (error) {
    console.error('Error responding to friend request:', error);
    return { error: error.message };
  }

  if (status === 'accepted') {
    await createNotification({
      userId: options.requesterId,
      type: 'friend_accepted',
      actorId: options.actorUserId,
      entityId: options.actorUserId,
    });
  }
  return {};
}

/** Cancels an outgoing pending request (deletes the row). */
export async function cancelFriendRequest(
  requestId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Error cancelling friend request:', error);
    return { error: error.message };
  }
  return {};
}

/** Removes a friendship (either party). */
export async function removeFriendRow(
  friendshipId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.error('Error removing friend:', error);
    return { error: error.message };
  }
  return {};
}

/** Searches public profiles by display name for friend discovery. */
export async function searchPublicProfiles(
  query: string
): Promise<{ data: ProfileSummary[]; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { data: [] };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, is_public')
    .eq('is_public', true)
    .ilike('display_name', `%${trimmed}%`)
    .limit(10);

  if (error) {
    console.error('Error searching profiles:', error);
    return { data: [], error: error.message };
  }
  return { data: (data as unknown as ProfileSummary[]) ?? [] };
}

/**
 * Suggests public profiles the user is not already connected to (friend or
 * pending request). Uses RLS so private profiles are excluded automatically.
 */
export async function fetchFriendSuggestions(
  userId: string
): Promise<{ data: ProfileSummary[]; error?: string }> {
  const { data: rows, error } = await supabase
    .from('friends')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching suggestions:', error);
    return { data: [], error: error.message };
  }

  const connectedIds = new Set<string>([userId]);
  (rows ?? []).forEach((row) => {
    connectedIds.add(row.requester_id as string);
    connectedIds.add(row.addressee_id as string);
  });

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, is_public')
    .eq('is_public', true)
    .limit(10);

  if (profileError) {
    console.error('Error fetching suggestion profiles:', profileError);
    return { data: [], error: profileError.message };
  }

  const suggestions = ((data as unknown as ProfileSummary[]) ?? []).filter(
    (profile) => !connectedIds.has(profile.id)
  );
  return { data: suggestions };
}
