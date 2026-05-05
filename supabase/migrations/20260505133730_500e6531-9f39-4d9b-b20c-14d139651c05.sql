
-- 1. Re-add a public SELECT policy on properties so anon can read approved rows
--    (column privileges below will hide the sensitive coordinate columns).
CREATE POLICY "Public can view approved properties (coords restricted)"
ON public.properties
FOR SELECT
TO anon
USING (status = 'approved'::property_status);

-- 2. Lock down the latitude/longitude columns at the privilege layer.
--    Owners/admins/agents/agency-managers retain access via their existing
--    authenticated policies + default authenticated grants below.
REVOKE SELECT (latitude, longitude) ON public.properties FROM anon;
REVOKE SELECT (latitude, longitude) ON public.properties FROM authenticated;

-- Grant authenticated SELECT back on every other column explicitly so the
-- existing authenticated policies keep working.
GRANT SELECT (
  id, user_id, address, city, municipality, property_type, listing_type,
  bedrooms, bathrooms, square_meters, floors, price, rental_price,
  price_negotiable, images, amenities, description, floor_plan_url,
  floor_plan_urls, unfurnished, year_built, last_renovated, apartments_count,
  agency_id, featured_section, property_code, status, created_at, updated_at
) ON public.properties TO anon, authenticated;

-- Re-grant coordinate access to admins via a SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.get_property_coords(_property_id uuid)
RETURNS TABLE (latitude numeric, longitude numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = _property_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.property_agents pa WHERE pa.property_id = _property_id AND pa.agent_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.profiles pr ON pr.agency_id = p.agency_id
      WHERE p.id = _property_id AND pr.user_id = auth.uid() AND pr.role = 'agency_manager'::user_role
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view exact coordinates';
  END IF;

  RETURN QUERY
  SELECT p.latitude, p.longitude FROM public.properties p WHERE p.id = _property_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_property_coords(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_coords(uuid) TO authenticated;

-- 3. Recreate the public view with security_invoker = true (no SECURITY DEFINER).
--    Since the view does not select latitude/longitude from the base table,
--    the column REVOKE above does not affect it. It computes a deterministic
--    jitter around the Beirut city center for anon viewers.
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
  public.jitter_coord(p.id, 33.8938, 'lat') AS latitude,
  public.jitter_coord(p.id, 35.5018, 'lng') AS longitude
FROM public.properties p;

GRANT SELECT ON public.properties_public TO anon, authenticated;
