-- Fix properties_public view to jitter around the REAL coordinates
-- (not the Beirut city center), and return exact coords for owners/admins.

DROP VIEW IF EXISTS public.properties_public CASCADE;

CREATE VIEW public.properties_public
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  p.id,
  p.user_id,
  p.address,
  p.city,
  p.municipality,
  p.property_type,
  p.listing_type,
  p.bedrooms,
  p.bathrooms,
  p.square_meters,
  p.floors,
  p.price,
  p.rental_price,
  p.price_negotiable,
  p.images,
  p.amenities,
  p.description,
  p.floor_plan_url,
  p.floor_plan_urls,
  p.unfurnished,
  p.year_built,
  p.last_renovated,
  p.apartments_count,
  p.agency_id,
  p.featured_section,
  p.property_code,
  p.status,
  p.created_at,
  p.updated_at,
  CASE
    WHEN auth.uid() IS NOT NULL
      AND (auth.uid() = p.user_id OR public.has_role(auth.uid(), 'admin'::user_role))
      THEN p.latitude
    ELSE public.jitter_coord(p.id, COALESCE(p.latitude, 33.8938), 'lat')
  END AS latitude,
  CASE
    WHEN auth.uid() IS NOT NULL
      AND (auth.uid() = p.user_id OR public.has_role(auth.uid(), 'admin'::user_role))
      THEN p.longitude
    ELSE public.jitter_coord(p.id, COALESCE(p.longitude, 35.5018), 'lng')
  END AS longitude
FROM public.properties p
WHERE p.status = 'approved'::property_status;

GRANT SELECT ON public.properties_public TO anon, authenticated;