
-- Aggregate sub-unit specs onto the stacked_unit parent so search filters
-- and PropertyCard show meaningful values on the building-level listing.

CREATE OR REPLACE FUNCTION public.aggregate_stacked_unit_parent(_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  agg_min_price numeric;
  agg_min_rent numeric;
  agg_max_sqm integer;
  agg_max_bed integer;
  agg_max_bath integer;
  agg_unit_count integer;
  agg_images text[];
BEGIN
  SELECT
    MIN(price),
    MIN(rental_price),
    COALESCE(MAX(square_meters), 0),
    COALESCE(MAX(bedrooms), 0),
    COALESCE(MAX(bathrooms), 0),
    COUNT(*)::int,
    COALESCE(
      (SELECT images FROM public.properties
        WHERE parent_property_id = _parent_id
          AND images IS NOT NULL
          AND array_length(images, 1) > 0
        ORDER BY created_at ASC
        LIMIT 1),
      '{}'::text[]
    )
  INTO agg_min_price, agg_min_rent, agg_max_sqm, agg_max_bed, agg_max_bath, agg_unit_count, agg_images
  FROM public.properties
  WHERE parent_property_id = _parent_id;

  UPDATE public.properties
     SET price = agg_min_price,
         rental_price = agg_min_rent,
         square_meters = agg_max_sqm,
         bedrooms = agg_max_bed,
         bathrooms = agg_max_bath,
         apartments_count = agg_unit_count,
         images = CASE
           WHEN images IS NULL OR array_length(images, 1) IS NULL
             THEN agg_images
           ELSE images
         END,
         updated_at = now()
   WHERE id = _parent_id
     AND property_type = 'stacked_unit';
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_aggregate_stacked_unit_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_property_id IS NOT NULL THEN
      PERFORM public.aggregate_stacked_unit_parent(OLD.parent_property_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.parent_property_id IS NOT NULL THEN
      PERFORM public.aggregate_stacked_unit_parent(NEW.parent_property_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.parent_property_id IS NOT NULL
       AND OLD.parent_property_id IS DISTINCT FROM NEW.parent_property_id THEN
      PERFORM public.aggregate_stacked_unit_parent(OLD.parent_property_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS aggregate_stacked_unit_parent_trg ON public.properties;
CREATE TRIGGER aggregate_stacked_unit_parent_trg
AFTER INSERT OR UPDATE OR DELETE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.trg_aggregate_stacked_unit_parent();

-- Backfill all existing stacked_unit parents
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.properties WHERE property_type = 'stacked_unit' LOOP
    PERFORM public.aggregate_stacked_unit_parent(r.id);
  END LOOP;
END $$;
