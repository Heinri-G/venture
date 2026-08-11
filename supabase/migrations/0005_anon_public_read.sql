-- =============================================
-- Task 7 follow-up: allow anon read access for public adventure links
-- The public view page is served without authentication, so the anon role needs
-- SELECT grants on the tables backing a public adventure. RLS
-- (adventure_visible_to_user, saved_places policy, profiles policy) still
-- restricts anon to PUBLIC adventures, their linked places, and the owning
-- profile — these grants only unlock the tables.
-- =============================================

GRANT SELECT ON public.adventures TO anon;
GRANT SELECT ON public.adventure_places TO anon;
GRANT SELECT ON public.saved_places TO anon;
