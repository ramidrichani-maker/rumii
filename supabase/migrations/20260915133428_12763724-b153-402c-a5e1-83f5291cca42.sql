ALTER TABLE public.property_viewings DROP CONSTRAINT property_viewings_property_id_viewing_date_viewing_time_key;

CREATE UNIQUE INDEX property_viewings_active_slot_key
  ON public.property_viewings (property_id, viewing_date, viewing_time)
  WHERE status IN ('pending', 'confirmed');