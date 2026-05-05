
-- 1. Replace the permissive public SELECT policy with an authenticated-only one.
DROP POLICY IF EXISTS "Users can view approved properties" ON public.properties;

CREATE POLICY "Authenticated users can view approved properties"
ON public.properties
FOR SELECT
TO authenticated
USING (status = 'approved'::property_status OR auth.uid() = user_id);

-- 2. Helper: deterministic jitter so the same property always shows the same offset.
CREATE OR REPLACE FUNCTION public.jitter_coord(_seed uuid, _base numeric, _axis text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT _base + (
    ((('x' || substr(md5(_seed::text || _axis), 1, 8))::bit(32)::int % 1600) / 100000.0)
  );
$$;

-- 3. Public-facing view that masks exact coordinates for non-admins.
DROP VIEW IF EXISTS public.properties_public CASCADE;

CREATE VIEW public.properties_public
WITH (security_invoker = false, security_barrier = true)
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
    WHEN auth.uid() IS NOT NULL AND (auth.uid() = p.user_id OR public.has_role(auth.uid(), 'admin'::user_role))
      THEN p.latitude
    ELSE public.jitter_coord(p.id, COALESCE(p.latitude, 33.8938), 'lat')
  END AS latitude,
  CASE
    WHEN auth.uid() IS NOT NULL AND (auth.uid() = p.user_id OR public.has_role(auth.uid(), 'admin'::user_role))
      THEN p.longitude
    ELSE public.jitter_coord(p.id, COALESCE(p.longitude, 35.5018), 'lng')
  END AS longitude
FROM public.properties p
WHERE p.status = 'approved'::property_status;

GRANT SELECT ON public.properties_public TO anon, authenticated;

-- 4. Fix mutable search_path warnings on the two remaining trigger functions.
CREATE OR REPLACE FUNCTION public.update_property_ai_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_set_updated_at_ai_designs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
