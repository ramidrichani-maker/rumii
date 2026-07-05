
-- Allow admins to update offer status
CREATE POLICY "Admins update offers" ON public.property_offers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notify admins on new offer & notify user when status changes
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
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('accepted', 'rejected') THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Offer ' || initcap(NEW.status),
      'Your offer for ' || COALESCE(prop_addr, 'the property') || ' has been ' || NEW.status || '.',
      CASE WHEN NEW.status = 'accepted' THEN 'success' ELSE 'error' END
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offer_events_ins ON public.property_offers;
DROP TRIGGER IF EXISTS trg_notify_offer_events_upd ON public.property_offers;

CREATE TRIGGER trg_notify_offer_events_ins
  AFTER INSERT ON public.property_offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_offer_events();

CREATE TRIGGER trg_notify_offer_events_upd
  AFTER UPDATE ON public.property_offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_offer_events();
