-- Store the original Google Maps URL so "Open in Google Maps" opens the place
-- rather than just dropping a pin at the coordinates.
ALTER TABLE public.places ADD COLUMN maps_url TEXT;
