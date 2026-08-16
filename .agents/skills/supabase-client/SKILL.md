---
name: supabase-client
description: Client-side Supabase query patterns for Venture (RLS/anon key, embedded-relation filtering, get-or-create, upsert, read-only vs write helpers).
---

# Supabase Client Skill

When reading or writing app data from the browser, use the Supabase JS client with the anon key under RLS. Never use the service role key client-side (see `.agents/rules/security.md`).

## Client & Auth
- Use the browser client in `src/lib/supabase/client.ts` (`createClient` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
- All queries must go through the anon key and rely on RLS policies to scope rows to the signed-in user (`user_id = auth.uid()`).
- Return `{ data, error }`-style results from helpers; log errors, never throw on expected empty results.

## Gotcha: Filtering on an Embedded Relation
Filtering on a related table's column **requires selecting that relation explicitly**. Otherwise PostgREST returns 400 with `'places' is not an embedded resource`.

```ts
// WRONG — 400 "'places' is not an embedded resource"
.from('saved_places')
.select('*')
.eq('user_id', userId)
.eq('places.provider', 'google')
.eq('places.provider_place_id', placeId);

// RIGHT — select the relation, use !inner for an inner join
.from('saved_places')
.select('*, places!inner(provider, provider_place_id)')
.eq('user_id', userId)
.eq('places.provider', 'google')
.eq('places.provider_place_id', placeId)
.maybeSingle();
```

## maybeSingle() vs single()
- Reads that may find nothing: use `.maybeSingle()` — returns `null`, never throws.
- After an insert when a row is guaranteed to exist: use `.select(...).single()`.
- `.single()` throws when zero rows are found — do not use it for lookups.

## Get-or-Create Pattern
Keyed on the unique business key (`provider` + `provider_place_id`, e.g. `google` + a Google place id): read first, insert only if missing, return the canonical `places.id`.

```ts
const { data: existing } = await supabase
  .from('places')
  .select('id')
  .eq('provider', provider)
  .eq('provider_place_id', providerPlaceId)
  .maybeSingle();
if (existing) return existing.id;

const { data: created, error } = await supabase
  .from('places')
  .insert({ provider, provider_place_id, name, address, latitude, longitude, category, icon })
  .select('id')
  .single();
```

Note: a partial unique index on `(provider, provider_place_id)` backs this; `provider` is NULL for manually added places, so use the app-layer `getOrCreatePlace` for those instead of assuming a DB constraint applies.

## Upsert Save Pattern
`UNIQUE(user_id, place_id)` on `saved_places` → use `upsert` with `onConflict` so save/update is one call.

```ts
await supabase
  .from('saved_places')
  .upsert(
    { user_id, place_id, rating, notes, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,place_id' }
  )
  .select('*')
  .single();
```

## Read-Only vs Write Helpers
- Fetch helpers (e.g. checking whether a place is already saved) must be read-only and never create rows.
- Only explicit user actions (save/update/remove) write.
- Deleting: `.delete().eq('user_id', userId).eq('place_id', placeId)`.

## Reference Implementation
`src/lib/savedPlaces.ts` is the canonical example: `getOrCreatePlace`, `findPlaceByProviderId`, `findSavedPlaceByProviderId`, `fetchSavedPlace`, `upsertSavedPlace`, `removeSavedPlace`, `fetchSavedPlaces`, `searchSavedPlaces`, `updateSavedPlace`, `deleteSavedPlace`.
