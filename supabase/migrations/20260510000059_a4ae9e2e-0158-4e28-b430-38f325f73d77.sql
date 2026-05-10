CREATE OR REPLACE FUNCTION public.route_property_enquiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prop RECORD;
  recipient_id uuid;
  sender_id uuid;
  msg_subject text;
  msg_body text;
  recipients uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT id, address, city, agency_id, user_id
    INTO prop
    FROM public.properties
   WHERE id = NEW.property_id;

  IF prop.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF prop.agency_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(DISTINCT pa.agent_id), ARRAY[]::uuid[])
      INTO recipients
      FROM public.property_agents pa
     WHERE pa.property_id = prop.id;

    IF array_length(recipients, 1) IS NULL THEN
      SELECT COALESCE(array_agg(DISTINCT p.user_id), ARRAY[]::uuid[])
        INTO recipients
        FROM public.profiles p
       WHERE p.agency_id = prop.agency_id
         AND p.role IN ('agency_manager'::user_role, 'agent'::user_role);
    END IF;
  END IF;

  IF array_length(recipients, 1) IS NULL THEN
    SELECT COALESCE(array_agg(p.user_id), ARRAY[]::uuid[])
      INTO recipients
      FROM public.profiles p
     WHERE p.role = 'admin'::user_role;
  END IF;

  IF NEW.agent_id IS NOT NULL AND NOT (NEW.agent_id = ANY(recipients)) THEN
    recipients := recipients || NEW.agent_id;
  END IF;

  -- Sender for messages.sender_user_id (NOT NULL). Prefer real sender, fall back to lister, then any admin.
  sender_id := COALESCE(
    NEW.sender_user_id,
    prop.user_id,
    (SELECT user_id FROM public.profiles WHERE role = 'admin'::user_role LIMIT 1)
  );

  IF sender_id IS NULL OR array_length(recipients, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  msg_subject := 'New property enquiry - ' || COALESCE(prop.address, '') ||
                 CASE WHEN prop.city IS NOT NULL THEN ', ' || prop.city ELSE '' END;

  msg_body := 'New enquiry from ' || NEW.full_name || E'\n\n' ||
              'Property: ' || COALESCE(prop.address, '') ||
              CASE WHEN prop.city IS NOT NULL THEN ', ' || prop.city ELSE '' END || E'\n' ||
              'Email: ' || NEW.email || E'\n' ||
              'Phone: ' || NEW.phone_number || E'\n' ||
              'Wants viewing: ' || CASE WHEN NEW.wants_viewing THEN 'Yes' ELSE 'No' END || E'\n\n' ||
              'Message:' || E'\n' ||
              COALESCE(NULLIF(NEW.message, ''), '(no message provided)');

  -- Deliver to every recipient. Only skip when the recipient is literally the real authenticated sender.
  FOREACH recipient_id IN ARRAY recipients LOOP
    IF recipient_id IS NOT NULL
       AND (NEW.sender_user_id IS NULL OR recipient_id <> NEW.sender_user_id)
    THEN
      INSERT INTO public.messages (
        sender_user_id, recipient_user_id, subject, body, related_property_id
      ) VALUES (
        sender_id, recipient_id, msg_subject, msg_body, NEW.property_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;