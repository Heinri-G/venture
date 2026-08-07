'use server';

import { createClient } from '@/lib/supabase/server';

export interface PlaceInput {
  foursquare_fsq_id?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  photo_url?: string;
}

export async function savePlace(placeInput: PlaceInput, notes: string, rating: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to save places.' };
  }

  // 1. Upsert canonical Place in `places` table
  let placeId: string;
  
  if (placeInput.foursquare_fsq_id) {
    const { data: existingPlace } = await supabase
      .from('places')
      .select('id')
      .eq('foursquare_fsq_id', placeInput.foursquare_fsq_id)
      .single();

    if (existingPlace) {
      placeId = existingPlace.id;
    } else {
      const { data: newPlace, error: placeError } = await supabase
        .from('places')
        .insert({
          foursquare_fsq_id: placeInput.foursquare_fsq_id,
          name: placeInput.name,
          address: placeInput.address,
          latitude: placeInput.latitude,
          longitude: placeInput.longitude,
          category: placeInput.category,
          photo_url: placeInput.photo_url,
        })
        .select('id')
        .single();

      if (placeError || !newPlace) {
        return { error: placeError?.message || 'Failed to save place record.' };
      }
      placeId = newPlace.id;
    }
  } else {
    // Custom pin drop or non-Foursquare place
    const { data: newPlace, error: placeError } = await supabase
      .from('places')
      .insert({
        name: placeInput.name,
        address: placeInput.address,
        latitude: placeInput.latitude,
        longitude: placeInput.longitude,
        category: placeInput.category || 'Custom Location',
        photo_url: placeInput.photo_url,
      })
      .select('id')
      .single();

    if (placeError || !newPlace) {
      return { error: placeError?.message || 'Failed to create place.' };
    }
    placeId = newPlace.id;
  }

  // 2. Insert into `saved_places` for user
  const { data: savedPlace, error: saveError } = await supabase
    .from('saved_places')
    .upsert({
      user_id: user.id,
      place_id: placeId,
      notes,
      rating,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,place_id' })
    .select('*')
    .single();

  if (saveError) {
    return { error: saveError.message };
  }

  return { success: true, savedPlace };
}

export async function getSavedPlaces() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_places')
    .select(`
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
        photo_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting saved places:', error);
    return [];
  }

  return data || [];
}

export async function deleteSavedPlace(savedPlaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('id', savedPlaceId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  return { success: true };
}
