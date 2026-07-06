
CREATE POLICY "Admins can update meetings"
  ON public.contract_meetings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_contract_meeting_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id uuid;
  prop_addr text;
  time_label text;
BEGIN
  SELECT address INTO prop_addr FROM public.properties WHERE id = NEW.property_id;
  time_label := CASE NEW.time_preference
                  WHEN 'morning' THEN 'morning'
                  WHEN 'afternoon' THEN 'afternoon'
                  ELSE 'all day' END;

  IF TG_OP = 'INSERT' THEN
    FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        admin_id,
        'New Contract Meeting Request',
        'A contract meeting was requested for ' || COALESCE(prop_addr, 'a property') || ' on ' || NEW.meeting_date || ' (' || time_label || ').',
        'info'
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('accepted','rejected') THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Contract Meeting ' || initcap(NEW.status),
      'Your contract meeting for ' || COALESCE(prop_addr, 'the property') || ' on ' || NEW.meeting_date || ' has been ' || NEW.status || '.',
      CASE WHEN NEW.status = 'accepted' THEN 'success' ELSE 'error' END
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_contract_meeting_events_trg ON public.contract_meetings;
CREATE TRIGGER notify_contract_meeting_events_trg
  AFTER INSERT OR UPDATE ON public.contract_meetings
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_meeting_events();
