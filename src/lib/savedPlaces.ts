import { supabase } from './supabase/client';

export interface Place {
  id: string;
  foursquare_fsq_id: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  place_id: string;
  notes: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceInput {
  foursquare_fsq_id?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  photo_url?: string;
}

export interface SavedPlacesResult {
  id: string;
  notes: string | null;
  rating: number | null;
  created_at: string;
  places: Place | null;
}

/**
 * Finds the canonical place by its Foursquare id, or creates it if it does
 * not yet exist in `public.places`. Returns the canonical `places.id`.
 */
export async function getOrCreatePlace(input: PlaceInput): Promise<{ placeId?: string; error?: string }> {
  if (input.foursquare_fsq_id) {
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('foursquare_fsq_id', input.foursquare_fsq_id)
      .maybeSingle();

    if (existing) {
      return { placeId: existing.id };
    }

    const { data: newPlace, error } = await supabase
      .from('places')
      .insert({
        foursquare_fsq_id: input.foursquare_fsq_id,
        name: input.name,
        address: input.address ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        category: input.category ?? null,
        photo_url: input.photo_url ?? null,
      })
      .select('id')
      .single();

    if (error || !newPlace) {
      return { error: error?.message || 'Failed to save place record.' };
    }
    return { placeId: newPlace.id };
  }

  // Custom pin drop or place without a Foursquare id.
  const { data: newPlace, error } = await supabase
    .from('places')
    .insert({
      name: input.name,
      address: input.address ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      category: input.category || 'Custom Location',
      photo_url: input.photo_url ?? null,
    })
    .select('id')
    .single();

  if (error || !newPlace) {
    return { error: error?.message || 'Failed to create place.' };
  }
  return { placeId: newPlace.id };
}

/** Fetches the current user's saved-place record for a given place, if any. */
export async function fetchSavedPlace(
  userId: string,
  placeId: string
): Promise<{ data?: SavedPlace; error?: string }> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .eq('user_id', userId)
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  return { data: data ?? undefined };
}

/**
 * Fetches the user's saved-place record for a Foursquare id. Unlike
 * `getOrCreatePlace` this is read-only and never creates a place row.
 */
export async function findSavedPlaceByFsqId(
  userId: string,
  fsqId: string
): Promise<{ data?: SavedPlace; error?: string }> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*, places!inner(foursquare_fsq_id)')
    .eq('user_id', userId)
    .eq('places.foursquare_fsq_id', fsqId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  return { data: data ?? undefined };
}

/** Creates or updates a `saved_places` row (UNIQUE(user_id, place_id)). */
export async function upsertSavedPlace(params: {
  userId: string;
  placeId: string;
  rating: number | null;
  notes: string | null;
}): Promise<{ data?: SavedPlace; error?: string }> {
  const { data, error } = await supabase
    .from('saved_places')
    .upsert(
      {
        user_id: params.userId,
        place_id: params.placeId,
        rating: params.rating,
        notes: params.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,place_id' }
    )
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }
  return { data: data ?? undefined };
}

/** Deletes the current user's saved-place record for a given place. */
export async function removeSavedPlace(
  userId: string,
  placeId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('user_id', userId)
    .eq('place_id', placeId);

  if (error) {
    return { error: error.message };
  }
  return {};
}

export type SavedPlacesSortBy = 'recent' | 'rated' | 'alphabetical' | 'distance';

export interface SavedPlaceWithDetails {
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
}

/**
 * Fetches the current user's saved places with their canonical place data,
 * paginated in batches. Supports a category filter and server-side sorting.
 * `sortBy === 'distance'` and `sortBy === 'alphabetical'` sort client-side
 * (they require the full set), so they fall back to server-side `recent`
 * ordering here.
 */
export async function fetchSavedPlaces(
  userId: string,
  page: number = 0,
  pageSize: number = 20,
  filterCategory?: string,
  sortBy: SavedPlacesSortBy = 'recent'
): Promise<{ data: SavedPlaceWithDetails[]; error?: string; totalCount: number }> {
  let query = supabase
    .from('saved_places')
    .select(
      `
      id, user_id, place_id, rating, notes, created_at, updated_at,
      place:places!inner(
        id, foursquare_fsq_id, name, address, latitude, longitude,
        category, photo_url, created_at
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

  if (filterCategory) {
    query = query.eq('place.category', filterCategory);
  }

  if (sortBy === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'rated') {
    query = query.order('rating', { ascending: false, nullsFirst: false });
  }

  const offset = page * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching saved places:', error);
    return { data: [], error: error.message, totalCount: 0 };
  }
  return { data: (data as unknown as SavedPlaceWithDetails[]) || [], totalCount: count ?? 0 };
}

/** Updates a saved-place row's rating and/or notes. */
export async function updateSavedPlace(
  savedPlaceId: string,
  updates: { rating?: number | null; notes?: string | null }
): Promise<{ data?: SavedPlace; error?: string }> {
  const { data, error } = await supabase
    .from('saved_places')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', savedPlaceId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }
  return { data: data ?? undefined };
}

/** Deletes a saved-place row by its saved-place id. */
export async function deleteSavedPlace(
  savedPlaceId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('id', savedPlaceId);

  if (error) {
    return { error: error.message };
  }
  return {};
}

/** Returns the distinct categories among the current user's saved places. */
export async function fetchSavedPlaceCategories(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('place:places(category)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching saved place categories:', error);
    return [];
  }

  const categories = [
    ...new Set(
      (data as unknown as { place: { category: string | null } | null }[]).map(
        (sp) => sp.place?.category
      )
    ),
  ].filter((c): c is string => Boolean(c));

  return categories.sort();
}

/** Lists the current user's saved places with their canonical place data. */
export async function getSavedPlaces(userId: string): Promise<SavedPlacesResult[]> {
  const { data, error } = await supabase
    .from('saved_places')
    .select(
      `
      id,
      notes,
      rating,
      created_at,
      places (
        id,
        foursquare_fsq_id,
        name,
        address,
        latitude,
        longitude,
        category,
        photo_url,
        created_at
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting saved places:', error);
    return [];
  }
  return (data as unknown as SavedPlacesResult[]) || [];
}
