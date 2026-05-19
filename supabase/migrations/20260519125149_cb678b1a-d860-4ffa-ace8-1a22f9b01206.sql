
-- 1. Parent link column
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS parent_property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_properties_parent_property_id
  ON public.properties(parent_property_id);

-- 2. Validation + inheritance trigger
CREATE OR REPLACE FUNCTION public.validate_stacked_unit_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_row public.properties%ROWTYPE;
BEGIN
  -- A stacked_unit parent cannot itself have a parent
  IF NEW.property_type = 'stacked_unit' AND NEW.parent_property_id IS NOT NULL THEN
    RAISE EXCEPTION 'A stacked_unit cannot have a parent_property_id';
  END IF;

  IF NEW.parent_property_id IS NOT NULL THEN
    SELECT * INTO parent_row FROM public.properties WHERE id = NEW.parent_property_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent property % not found', NEW.parent_property_id;
    END IF;

    IF parent_row.property_type <> 'stacked_unit' THEN
      RAISE EXCEPTION 'parent_property_id must reference a stacked_unit property';
    END IF;

    IF NEW.property_type NOT IN ('apartment','duplex','triplex','penthouse','studio','rooftop') THEN
      RAISE EXCEPTION 'Sub-units must be one of: apartment, duplex, triplex, penthouse, studio, rooftop';
    END IF;

    -- Inherit shared fields from parent
    NEW.listing_type := parent_row.listing_type;
    NEW.address := parent_row.address;
    NEW.city := parent_row.city;
    NEW.municipality := parent_row.municipality;
    NEW.agency_id := parent_row.agency_id;
    NEW.latitude := COALESCE(NEW.latitude, parent_row.latitude);
    NEW.longitude := COALESCE(NEW.longitude, parent_row.longitude);
    -- On INSERT inherit status; on UPDATE keep what cascade trigger sets
    IF TG_OP = 'INSERT' THEN
      NEW.status := parent_row.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_stacked_unit_relationship ON public.properties;
CREATE TRIGGER trg_validate_stacked_unit_relationship
BEFORE INSERT OR UPDATE OF parent_property_id, property_type, listing_type, address, city, municipality, agency_id
ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.validate_stacked_unit_relationship();

-- 3. Cascade status changes from parent to children
CREATE OR REPLACE FUNCTION public.cascade_stacked_unit_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.property_type = 'stacked_unit' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.address IS DISTINCT FROM OLD.address
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.municipality IS DISTINCT FROM OLD.municipality
       OR NEW.listing_type IS DISTINCT FROM OLD.listing_type
       OR NEW.agency_id IS DISTINCT FROM OLD.agency_id THEN
      UPDATE public.properties
         SET status = NEW.status,
             address = NEW.address,
             city = NEW.city,
             municipality = NEW.municipality,
             listing_type = NEW.listing_type,
             agency_id = NEW.agency_id,
             updated_at = now()
       WHERE parent_property_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_stacked_unit_updates ON public.properties;
CREATE TRIGGER trg_cascade_stacked_unit_updates
AFTER UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.cascade_stacked_unit_updates();
