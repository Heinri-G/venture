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
