
-- 1. Private exact coordinates table
CREATE TABLE IF NOT EXISTS public.property_coordinates (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  latitude numeric,
  longitude numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_coordinates TO authenticated;
GRANT ALL ON public.property_coordinates TO service_role;

ALTER TABLE public.property_coordinates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and staff can view exact coordinates" ON public.property_coordinates;
CREATE POLICY "Owners and staff can view exact coordinates"
ON public.property_coordinates FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
  OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.property_agents pa WHERE pa.property_id = property_coordinates.property_id AND pa.agent_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.profiles pr ON pr.agency_id = p.agency_id
    WHERE p.id = property_coordinates.property_id AND pr.user_id = auth.uid() AND pr.role = 'agency_manager'::user_role
  )
);

-- 2. Backfill exact coordinates, then mask the public columns
INSERT INTO public.property_coordinates (property_id, latitude, longitude)
SELECT id, latitude, longitude FROM public.properties
ON CONFLICT (property_id) DO NOTHING;

-- 3. Masking trigger: exact values are stored privately, public columns keep jittered values
CREATE OR REPLACE FUNCTION public.mask_property_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
    INSERT INTO public.property_coordinates (property_id, latitude, longitude, updated_at)
    VALUES (NEW.id, NEW.latitude, NEW.longitude, now())
    ON CONFLICT (property_id) DO UPDATE
      SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = now();

    IF NEW.latitude IS NOT NULL THEN
      NEW.latitude := public.jitter_coord(NEW.id, NEW.latitude, 'lat');
    END IF;
    IF NEW.longitude IS NOT NULL THEN
      NEW.longitude := public.jitter_coord(NEW.id, NEW.longitude, 'lng');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mask_property_coordinates_trg ON public.properties;
CREATE TRIGGER mask_property_coordinates_trg
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.mask_property_coordinates();

UPDATE public.properties p
SET latitude = public.jitter_coord(p.id, pc.latitude, 'lat'),
    longitude = public.jitter_coord(p.id, pc.longitude, 'lng')
FROM public.property_coordinates pc
WHERE pc.property_id = p.id AND pc.latitude IS NOT NULL AND pc.longitude IS NOT NULL;

-- 4. Exact coordinates accessor reads the private table
CREATE OR REPLACE FUNCTION public.get_property_coords(_property_id uuid)
RETURNS TABLE(latitude numeric, longitude numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  SELECT pc.latitude, pc.longitude FROM public.property_coordinates pc WHERE pc.property_id = _property_id;
END;
$$;

-- 5. properties_public becomes a security invoker view (no RLS bypass)
DROP VIEW IF EXISTS public.properties_public;
CREATE VIEW public.properties_public
WITH (security_invoker = on) AS
SELECT id, user_id, address, city, municipality, property_type, listing_type,
       bedrooms, bathrooms, square_meters, floors, price, rental_price,
       price_negotiable, images, amenities, description, floor_plan_url,
       floor_plan_urls, unfurnished, year_built, last_renovated, apartments_count,
       agency_id, featured_section, property_code, status, created_at, updated_at,
       latitude, longitude, parent_property_id
FROM public.properties
WHERE status = 'approved'::property_status;

GRANT SELECT ON public.properties_public TO anon, authenticated;
GRANT ALL ON public.properties_public TO service_role;

-- 6. Signup role escalation fix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', ''),
    'user'::user_role
  );
  RETURN NEW;
END;
$$;

-- 7. AI job requestor spoofing fix
DROP POLICY IF EXISTS "property_ai_jobs_insert_for_owner" ON public.property_ai_jobs;
CREATE POLICY "property_ai_jobs_insert_for_owner"
ON public.property_ai_jobs FOR INSERT TO authenticated
WITH CHECK (
  requestor_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  )
);

-- 8. Remove needless EXECUTE grants on SECURITY DEFINER routines
REVOKE ALL ON FUNCTION public.aggregate_stacked_unit_parent(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_oracle_agent() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_oracle_agent_after() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_support_agent() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cascade_stacked_unit_updates() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.mask_property_coordinates() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_property_pending() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_agent_viewing_request() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_area_alert_matches() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_contract_meeting_events() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_offer_events() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_property_status_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_viewing_confirmed() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_self_escalation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.route_property_enquiry() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_aggregate_stacked_unit_parent() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_stacked_unit_relationship() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_user_ids() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_user_account(uuid, uuid) FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.approve_property_media(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_support_conversations() FROM anon;
REVOKE ALL ON FUNCTION public.get_agent_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_new_users_analytics(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_session_analytics(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_property_coords(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.start_user_session(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.end_user_session(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.update_user_role(uuid, user_role, uuid) FROM anon;
