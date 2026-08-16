-- =============================================
-- 0009 Provider-neutral places
-- =============================================
-- Replaces the Foursquare-only key on `places` with a provider-neutral one so
-- places can come from Google Maps shares or manual entry. Existing rows are
-- backfilled to `provider = 'foursquare'` and keep working.

-- New columns
ALTER TABLE public.places
  ADD COLUMN provider TEXT,
  ADD COLUMN provider_place_id TEXT,
  ADD COLUMN icon TEXT;

-- Backfill existing Foursquare-sourced rows
UPDATE public.places
  SET provider = 'foursquare',
      provider_place_id = foursquare_fsq_id
  WHERE foursquare_fsq_id IS NOT NULL;

-- New get-or-create key: a place is unique per (provider, provider_place_id).
-- Partial so manual places (provider = 'manual', no external id) aren't forced
-- to carry a provider_place_id.
CREATE UNIQUE INDEX idx_places_provider_place
  ON public.places(provider, provider_place_id)
  WHERE provider IS NOT NULL AND provider_place_id IS NOT NULL;

-- Drop the legacy Foursquare column and its indexes (the UNIQUE constraint's
-- index is dropped with the column).
DROP INDEX IF EXISTS idx_places_foursquare;
ALTER TABLE public.places DROP COLUMN foursquare_fsq_id;
