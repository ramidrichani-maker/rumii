
-- Add alert_enabled to saved_search_areas
ALTER TABLE public.saved_search_areas
  ADD COLUMN IF NOT EXISTS alert_enabled boolean NOT NULL DEFAULT false;

-- Point-in-polygon (ray casting). coords is a jsonb array of {latitude, longitude}
CREATE OR REPLACE FUNCTION public.point_in_polygon(_lat numeric, _lng numeric, _coords jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  n int;
  i int;
  j int;
  xi numeric; yi numeric;
  xj numeric; yj numeric;
  inside boolean := false;
  x numeric := _lng;
  y numeric := _lat;
BEGIN
  IF _coords IS NULL OR jsonb_typeof(_coords) <> 'array' THEN RETURN false; END IF;
  n := jsonb_array_length(_coords);
  IF n < 3 THEN RETURN false; END IF;
  j := n - 1;
  FOR i IN 0..(n-1) LOOP
    xi := (_coords -> i ->> 'longitude')::numeric;
    yi := (_coords -> i ->> 'latitude')::numeric;
    xj := (_coords -> j ->> 'longitude')::numeric;
    yj := (_coords -> j ->> 'latitude')::numeric;
    IF ((yi > y) <> (yj > y)) AND (x < (xj - xi) * (y - yi) / NULLIF((yj - yi), 0) + xi) THEN
      inside := NOT inside;
    END IF;
    j := i;
  END LOOP;
  RETURN inside;
END;
$$;

-- Trigger to send in-app alerts when new/approved property matches saved alert areas
CREATE OR REPLACE FUNCTION public.notify_area_alert_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  area RECORD;
  coords_json jsonb;
BEGIN
  IF NEW.status <> 'approved' OR NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;
  END IF;
  -- only on newly approved
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  FOR area IN
    SELECT id, user_id, name, page, coordinates
    FROM public.saved_search_areas
    WHERE alert_enabled = true
      AND ((page = 'purchase' AND NEW.listing_type IN ('sale','both'))
        OR (page = 'rent' AND NEW.listing_type IN ('rent','both')))
  LOOP
    coords_json := CASE
      WHEN jsonb_typeof(to_jsonb(area.coordinates)) = 'array' THEN to_jsonb(area.coordinates)
      ELSE (area.coordinates)::jsonb
    END;
    IF public.point_in_polygon(NEW.latitude, NEW.longitude, coords_json) THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        area.user_id,
        'New listing in "' || area.name || '"',
        'A new property at ' || NEW.address || ', ' || NEW.city || ' matches your saved area.',
        'info'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_area_alerts_insert ON public.properties;
CREATE TRIGGER notify_area_alerts_insert
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.notify_area_alert_matches();

DROP TRIGGER IF EXISTS notify_area_alerts_update ON public.properties;
CREATE TRIGGER notify_area_alerts_update
  AFTER UPDATE OF status ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.notify_area_alert_matches();

-- Allow update of alert flag
DROP POLICY IF EXISTS "Users can update own saved areas" ON public.saved_search_areas;
CREATE POLICY "Users can update own saved areas"
  ON public.saved_search_areas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
