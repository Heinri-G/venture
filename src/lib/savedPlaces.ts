import { supabase } from './supabase/client';

export type PlaceProvider = 'google' | 'manual' | 'foursquare';

export interface Place {
  id: string;
  provider: PlaceProvider | null;
  provider_place_id: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  icon: string | null;
  maps_url: string | null;
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
  provider: PlaceProvider;
  providerPlaceId?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  icon?: string;
  mapsUrl?: string;
}

export interface SavedPlacesResult {
  id: string;
  notes: string | null;
  rating: number | null;
  created_at: string;
  places: Place | null;
}

const PLACE_COLUMNS = `
  id, provider, provider_place_id, name, address, latitude, longitude,
  category, icon, maps_url, created_at
`;

const SAVED_PLACE_WITH_PLACE_SELECT = `
  id, user_id, place_id, rating, notes, created_at, updated_at,
  place:places!inner(
    id, provider, provider_place_id, name, address, latitude, longitude,
    category, icon, maps_url, created_at
  )
`;

/**
 * Finds the canonical place by its (provider, provider_place_id) key, or
 * creates it if it does not yet exist in `public.places`. Returns the
 * canonical `places.id`.
 */
export async function getOrCreatePlace(input: PlaceInput): Promise<{ placeId?: string; error?: string }> {
  if (input.providerPlaceId) {
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('provider', input.provider)
      .eq('provider_place_id', input.providerPlaceId)
      .maybeSingle();

    if (existing) {
      return { placeId: existing.id };
    }

    const { data: newPlace, error } = await supabase
      .from('places')
      .insert({
        provider: input.provider,
        provider_place_id: input.providerPlaceId,
        name: input.name,
        address: input.address ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        category: input.category ?? null,
        icon: input.icon ?? null,
        maps_url: input.mapsUrl ?? null,
      })
      .select('id')
      .single();

    if (error || !newPlace) {
      return { error: error?.message || 'Failed to save place record.' };
    }
    return { placeId: newPlace.id };
  }

  // Manual entry — no external place id, so every save creates its own row.
  const { data: newPlace, error } = await supabase
    .from('places')
    .insert({
      provider: input.provider,
      provider_place_id: null,
      name: input.name,
      address: input.address ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      category: input.category || 'Custom Location',
      icon: input.icon ?? null,
      maps_url: input.mapsUrl ?? null,
    })
    .select('id')
    .single();

  if (error || !newPlace) {
    return { error: error?.message || 'Failed to create place.' };
  }
  return { placeId: newPlace.id };
}

/** Read-only lookup of a canonical place by its provider key. Never creates. */
export async function findPlaceByProviderId(
  provider: string,
  providerPlaceId: string
): Promise<{ data?: Place; error?: string }> {
  const { data, error } = await supabase
    .from('places')
    .select(PLACE_COLUMNS)
    .eq('provider', provider)
    .eq('provider_place_id', providerPlaceId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  return { data: (data as Place) ?? undefined };
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
 * Fetches the user's saved-place record for a provider-keyed place. Unlike
 * `getOrCreatePlace` this is read-only and never creates a place row.
 */
export async function findSavedPlaceByProviderId(
  userId: string,
  provider: string,
  providerPlaceId: string
): Promise<{ data?: SavedPlace; error?: string }> {
  const { data, error } = await supabase
    .from('saved_places')
    .select(`id, user_id, place_id, rating, notes, created_at, updated_at, places!inner(provider, provider_place_id)`)
    .eq('user_id', userId)
    .eq('places.provider', provider)
    .eq('places.provider_place_id', providerPlaceId)
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
  place: Place;
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
    .select(SAVED_PLACE_WITH_PLACE_SELECT, { count: 'exact' })
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

/**
 * Searches the current user's saved places by name, address or category.
 * Server-side `ilike` against the canonical places table, then joined to the
 * user's saved places, ordered by recency.
 */
export async function searchSavedPlaces(
  userId: string,
  query: string,
  limit: number = 10
): Promise<{ data: SavedPlaceWithDetails[]; error?: string }> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { data: [], error: undefined };
  }
  const escaped = trimmed.replace(/'/g, "''").replace(/[*"]/g, '');

  const { data: matches, error: matchError } = await supabase
    .from('places')
    .select('id')
    .or(`name.ilike.*${escaped}*,address.ilike.*${escaped}*,category.ilike.*${escaped}*`)
    .limit(100);

  if (matchError) {
    console.error('Error searching saved places:', matchError);
    return { data: [], error: matchError.message };
  }
  if (!matches || matches.length === 0) {
    return { data: [] };
  }

  const { data, error } = await supabase
    .from('saved_places')
    .select(SAVED_PLACE_WITH_PLACE_SELECT)
    .eq('user_id', userId)
    .in('place_id', matches.map((m) => m.id))
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching saved places:', error);
    return { data: [], error: error.message };
  }
  return { data: (data as unknown as SavedPlaceWithDetails[]) || [] };
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
        provider,
        provider_place_id,
        name,
        address,
        latitude,
        longitude,
        category,
        icon,
        maps_url,
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
