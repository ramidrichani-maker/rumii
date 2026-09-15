CREATE OR REPLACE FUNCTION public.mask_property_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  exact_lat numeric;
  exact_lng numeric;
  same_as_old boolean;
  same_as_exact boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
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
    RETURN NEW;
  END IF;

  SELECT pc.latitude, pc.longitude INTO exact_lat, exact_lng
  FROM public.property_coordinates pc WHERE pc.property_id = NEW.id;

  -- Unchanged (within rounding tolerance) vs the currently stored masked value
  same_as_old := (NEW.latitude IS NOT DISTINCT FROM OLD.latitude AND NEW.longitude IS NOT DISTINCT FROM OLD.longitude)
    OR (NEW.latitude IS NOT NULL AND OLD.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND OLD.longitude IS NOT NULL
        AND abs(NEW.latitude - OLD.latitude) < 0.000005 AND abs(NEW.longitude - OLD.longitude) < 0.000005);

  IF same_as_old THEN
    NEW.latitude := OLD.latitude;
    NEW.longitude := OLD.longitude;
    RETURN NEW;
  END IF;

  -- Re-saving the exact coordinates must reproduce the same masked value, never drift
  same_as_exact := exact_lat IS NOT NULL AND exact_lng IS NOT NULL
    AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
    AND abs(NEW.latitude - exact_lat) < 0.000005 AND abs(NEW.longitude - exact_lng) < 0.000005;

  IF same_as_exact THEN
    NEW.latitude := public.jitter_coord(NEW.id, exact_lat, 'lat');
    NEW.longitude := public.jitter_coord(NEW.id, exact_lng, 'lng');
    RETURN NEW;
  END IF;

  -- Genuine coordinate edit
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
  RETURN NEW;
END;
$$;