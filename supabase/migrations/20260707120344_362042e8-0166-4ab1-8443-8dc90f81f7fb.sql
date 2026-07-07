
ALTER TABLE public.property_offers
  ADD COLUMN IF NOT EXISTS counter_amount numeric,
  ADD COLUMN IF NOT EXISTS counter_message text;

CREATE OR REPLACE FUNCTION public.notify_offer_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id uuid;
  prop_addr text;
BEGIN
  SELECT address INTO prop_addr FROM public.properties WHERE id = NEW.property_id;

  IF TG_OP = 'INSERT' THEN
    FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        admin_id,
        'New Offer Submitted',
        'A ' || NEW.offer_type || ' offer of $' || NEW.amount || ' was submitted for ' || COALESCE(prop_addr, 'a property'),
        'info'
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('accepted', 'rejected') THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Offer ' || initcap(NEW.status),
        'Your offer for ' || COALESCE(prop_addr, 'the property') || ' has been ' || NEW.status || '.',
        CASE WHEN NEW.status = 'accepted' THEN 'success' ELSE 'error' END
      );
    ELSIF NEW.status = 'countered' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Counter Offer Received',
        'Admin has countered your offer for ' || COALESCE(prop_addr, 'the property') || ' at $' || COALESCE(NEW.counter_amount::text, '') || '.',
        'info'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
