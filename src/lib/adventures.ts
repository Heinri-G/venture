import { supabase } from './supabase/client';

export type AdventureVisibility = 'private' | 'shared' | 'public';

export interface Adventure {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  visibility: AdventureVisibility;
  allow_collaboration: boolean;
  public_link_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdventurePlace {
  id: string;
  adventure_id: string;
  saved_place_id: string;
  order_index: number;
}

export interface AdventurePlaceWithDetails extends AdventurePlace {
  saved_place: {
    id: string;
    user_id: string;
    place_id: string;
    rating: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    place: {
      id: string;
      foursquare_fsq_id: string | null;
      name: string;
      address: string | null;
      latitude: number;
      longitude: number;
      category: string | null;
      photo_url: string | null;
      created_at: string;
    };
  };
}

export interface AdventureWithPlaces extends Adventure {
  adventure_places: AdventurePlaceWithDetails[];
  adventure_shares?: AdventureShareRow[];
}

export interface AdventureShareRow {
  id: string;
  adventure_id: string;
  shared_with_user_id: string | null;
  shared_with_group_id: string | null;
  can_edit: boolean;
  created_at: string;
  shared_with_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  shared_with_group?: { id: string; name: string } | null;
}

export type AdventuresSortBy = 'recent' | 'updated' | 'title' | 'places';

export const ADVENTURES_PAGE_SIZE = 10;

/** Fetches a paginated batch of the user's adventures with server-side sorting. */
export async function fetchUserAdventures(
  userId: string,
  options: { page?: number; pageSize?: number; sortBy?: AdventuresSortBy } = {}
): Promise<{ data: Adventure[]; totalCount: number; error?: string }> {
  const { page = 0, pageSize = ADVENTURES_PAGE_SIZE, sortBy = 'recent' } = options;

  let query = supabase
    .from('adventures')
    .select('*', { count: 'exact' })
    .eq('owner_id', userId);

  if (sortBy === 'updated') {
    query = query.order('updated_at', { ascending: false });
  } else if (sortBy === 'title') {
    query = query.order('title', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const offset = page * pageSize;
  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching adventures:', error);
    return { data: [], totalCount: 0, error: error.message };
  }
  return { data: (data as Adventure[]) || [], totalCount: count ?? 0 };
}

/** Returns the number of linked places per adventure for the given ids. */
export async function fetchAdventurePlaceCounts(
  adventureIds: string[]
): Promise<Record<string, number>> {
  if (adventureIds.length === 0) return {};
  const { data, error } = await supabase
    .from('adventure_places')
    .select('id, adventure_id')
    .in('adventure_id', adventureIds);

  if (error) {
    console.error('Error fetching adventure place counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data as { adventure_id: string }[]) {
    counts[row.adventure_id] = (counts[row.adventure_id] ?? 0) + 1;
  }
  return counts;
}

/** Fetches a single adventure with its ordered, linked saved places. */
export async function fetchAdventureWithPlaces(
  adventureId: string
): Promise<{ data?: AdventureWithPlaces; error?: string }> {
  const { data, error } = await supabase
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
            id, foursquare_fsq_id, name, address, latitude, longitude,
            category, photo_url, created_at
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

  if (error) {
    console.error('Error fetching adventure:', error);
    return { error: error.message };
  }
  if (!data) return { data: undefined };

  const adventure = data as unknown as AdventureWithPlaces;
  if (adventure.adventure_places) {
    adventure.adventure_places.sort((a, b) => a.order_index - b.order_index);
  }
  return { data: adventure };
}

/** Creates a new adventure owned by the given user. */
export async function createAdventure(params: {
  ownerId: string;
  title: string;
  description: string | null;
  coverPhotoUrl: string | null;
  visibility: AdventureVisibility;
  allowCollaboration?: boolean;
}): Promise<{ data?: Adventure; error?: string }> {
  const { data, error } = await supabase
    .from('adventures')
    .insert({
      owner_id: params.ownerId,
      title: params.title,
      description: params.description,
      cover_photo_url: params.coverPhotoUrl,
      visibility: params.visibility,
      allow_collaboration: params.allowCollaboration ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating adventure:', error);
    return { error: error.message };
  }
  return { data: data as Adventure };
}

/** Links saved places to an adventure with their order. */
export async function linkPlacesToAdventure(
  adventureId: string,
  places: Array<{ savedPlaceId: string; orderIndex: number }>
): Promise<{ error?: string }> {
  if (places.length === 0) return {};
  const rows = places.map(({ savedPlaceId, orderIndex }) => ({
    adventure_id: adventureId,
    saved_place_id: savedPlaceId,
    order_index: orderIndex,
  }));

  const { error } = await supabase.from('adventure_places').insert(rows);
  if (error) {
    console.error('Error linking places to adventure:', error);
    return { error: error.message };
  }
  return {};
}

/** Updates adventure metadata and bumps the updated_at timestamp. */
export async function updateAdventure(
  adventureId: string,
  updates: Partial<{
    title: string;
    description: string | null;
    cover_photo_url: string | null;
    visibility: AdventureVisibility;
    allow_collaboration: boolean;
    public_link_token: string | null;
  }>
): Promise<{ data?: Adventure; error?: string }> {
  const { data, error } = await supabase
    .from('adventures')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adventureId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating adventure:', error);
    return { error: error.message };
  }
  return { data: (data as Adventure) ?? undefined };
}

/** Updates the order_index of the given adventure-place rows in a batch. */
export async function reorderAdventurePlaces(
  items: Array<{ id: string; orderIndex: number }>
): Promise<{ error?: string }> {
  if (items.length === 0) return {};
  for (const { id, orderIndex } of items) {
    const { error } = await supabase
      .from('adventure_places')
      .update({ order_index: orderIndex })
      .eq('id', id);
    if (error) {
      console.error('Error reordering adventure places:', error);
      return { error: error.message };
    }
  }
  return {};
}

/** Deletes an adventure; linked adventure_places rows cascade. */
export async function deleteAdventure(adventureId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('adventures').delete().eq('id', adventureId);
  if (error) {
    console.error('Error deleting adventure:', error);
    return { error: error.message };
  }
  return {};
}

/** Removes a single adventure_places row. */
export async function removePlaceFromAdventure(
  adventurePlaceId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('adventure_places')
    .delete()
    .eq('id', adventurePlaceId);
  if (error) {
    console.error('Error removing place from adventure:', error);
    return { error: error.message };
  }
  return {};
}

/** Removes every linked place from an adventure (used when replacing the set). */
export async function removeAllPlacesFromAdventure(
  adventureId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('adventure_places')
    .delete()
    .eq('adventure_id', adventureId);
  if (error) {
    console.error('Error clearing adventure places:', error);
    return { error: error.message };
  }
  return {};
}

/**
 * Uploads a cover photo to the `adventures` storage bucket and returns its
 * public URL. Files are namespaced per adventure so re-uploads upsert safely.
 */
export async function uploadAdventureCover(
  file: File,
  adventureId: string
): Promise<{ url?: string; error?: string }> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${adventureId}/cover.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('adventures')
    .upload(filePath, file, { upsert: true });
  if (uploadError) {
    console.error('Error uploading cover photo:', uploadError);
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from('adventures').getPublicUrl(filePath);
  return { url: data?.publicUrl };
}

/** Renders an ISO timestamp as a compact relative string, e.g. "2 days ago". */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
