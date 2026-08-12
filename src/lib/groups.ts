import { supabase } from './supabase/client';
import { createNotification } from './notifications';
import type { ProfileSummary } from './friends';

export type GroupRole = 'admin' | 'member';

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profile?: ProfileSummary | null;
}

export interface GroupWithCount {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
}

export interface GroupSharedAdventure {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  visibility: string;
  allow_collaboration: boolean;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  members: GroupMember[];
  adventure_shares: GroupSharedAdventure[];
}

/** Normalizes a PostgREST embedded `count` (array or bare object). */
function extractCount(value: unknown): number {
  if (Array.isArray(value)) {
    const first = value[0] as { count?: number } | undefined;
    return typeof first?.count === 'number' ? first.count : 0;
  }
  if (value && typeof value === 'object') {
    const obj = value as { count?: number };
    return typeof obj.count === 'number' ? obj.count : 0;
  }
  return 0;
}

/** Creates a group and adds the creator as its admin. */
export async function createGroup(
  userId: string,
  params: {
    name: string;
    description: string | null;
    avatarUrl: string | null;
  }
): Promise<{ data?: GroupWithCount; error?: string }> {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: params.name,
      description: params.description,
      avatar_url: params.avatarUrl,
      created_by: userId,
    })
    .select('id, name, description, avatar_url, created_by, created_at')
    .single();

  if (groupError || !group) {
    console.error('Error creating group:', groupError);
    return { error: groupError?.message || 'Failed to create group.' };
  }

  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'admin',
  });

  if (memberError) {
    console.error('Error adding creator as admin:', memberError);
    await supabase.from('groups').delete().eq('id', group.id).maybeSingle();
    return { error: memberError.message };
  }

  return { data: { ...group, member_count: 1 } };
}

/** Fetches the groups the user belongs to, with member counts. */
export async function fetchGroupsForUser(
  userId: string
): Promise<{ data: GroupWithCount[]; error?: string }> {
  const { data, error } = await supabase
    .from('group_members')
    .select(
      `
      groups:group_id(
        id, name, description, avatar_url, created_by, created_at,
        group_members:group_members(count)
      )
      `
    )
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Error fetching groups:', error);
    return { data: [], error: error.message };
  }

  const groups = (data ?? []).flatMap((row) => row.groups ?? []);
  return {
    data: groups.map((group) => ({
      ...group,
      member_count: extractCount(group.group_members),
    })),
  };
}

/** Fetches a single group with its members and shared adventures. */
export async function fetchGroupDetail(
  groupId: string
): Promise<{ data?: GroupDetail; error?: string }> {
  const { data, error } = await supabase
    .from('groups')
    .select(
      `
      id, name, description, avatar_url, created_by, created_at,
      group_members(
        id, user_id, role, joined_at,
        profile:user_id(id, display_name, avatar_url, bio, is_public)
      ),
      adventure_shares(
        adventure:adventure_id(
          id, owner_id, title, description, cover_photo_url,
          visibility, allow_collaboration
        )
      )
      `
    )
    .eq('id', groupId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching group:', error);
    return { error: error.message };
  }
  if (!data) return { data: undefined };

  const detail = data as unknown as GroupDetail;
  detail.members = (detail.members ?? []).sort((a, b) => {
    if (a.role === b.role) return a.joined_at.localeCompare(b.joined_at);
    return a.role === 'admin' ? -1 : 1;
  });
  detail.adventure_shares = (detail.adventure_shares ?? []).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  return { data: detail };
}

/** Adds a member (admin only) and notifies them. */
export async function addGroupMember(
  groupId: string,
  userId: string,
  actorUserId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role: 'member',
  });

  if (error) {
    console.error('Error adding group member:', error);
    return { error: error.message };
  }

  await createNotification({
    userId,
    type: 'group_invite',
    actorId: actorUserId,
    entityId: groupId,
  });
  return {};
}

/** Updates a member's role (admin only). */
export async function updateMemberRole(
  membershipId: string,
  role: GroupRole
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('id', membershipId);

  if (error) {
    console.error('Error updating member role:', error);
    return { error: error.message };
  }
  return {};
}

/** Removes a member or lets a member leave (deletes the membership row). */
export async function removeGroupMember(
  membershipId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('id', membershipId);

  if (error) {
    console.error('Error removing group member:', error);
    return { error: error.message };
  }
  return {};
}

/** Updates group name/description/avatar (admin only). */
export async function updateGroup(
  groupId: string,
  params: { name: string; description: string | null; avatarUrl: string | null }
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('groups')
    .update({
      name: params.name,
      description: params.description,
      avatar_url: params.avatarUrl,
    })
    .eq('id', groupId);

  if (error) {
    console.error('Error updating group:', error);
    return { error: error.message };
  }
  return {};
}

/** Deletes a group (admin only); memberships and shares cascade. */
export async function deleteGroup(groupId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) {
    console.error('Error deleting group:', error);
    return { error: error.message };
  }
  return {};
}

/**
 * Uploads a group avatar to the `groups` bucket and returns its public URL.
 */
export async function uploadGroupAvatar(
  file: File,
  groupId: string
): Promise<{ url?: string; error?: string }> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${groupId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('groups')
    .upload(filePath, file, { upsert: true });
  if (uploadError) {
    console.error('Error uploading group avatar:', uploadError);
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from('groups').getPublicUrl(filePath);
  return { url: data?.publicUrl };
}

/** Fetches the profiles of the user's friends (for group invite pickers). */
export async function fetchFriendsForGroupInvite(
  userId: string
): Promise<{ data: ProfileSummary[]; error?: string }> {
  const { data: rows, error } = await supabase
    .from('friends')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching friend ids:', error);
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
    .select('id, display_name, avatar_url, bio, is_public')
    .in('id', friendIds);

  if (profileError) {
    console.error('Error fetching friend profiles:', profileError);
    return { data: [], error: profileError.message };
  }
  return { data: (profiles as unknown as ProfileSummary[]) ?? [] };
}
