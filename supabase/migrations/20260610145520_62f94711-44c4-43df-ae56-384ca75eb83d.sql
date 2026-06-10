CREATE OR REPLACE FUNCTION public.notify_agent_viewing_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  property_address text;
  property_agency_id uuid;
  agent_user_id uuid;
  is_rep boolean := false;
  admin_id uuid;
BEGIN
  -- Get property address + agency
  SELECT address, agency_id INTO property_address, property_agency_id
  FROM properties
  WHERE id = NEW.property_id;

  -- Get assigned agent for the property and set it on the viewing
  SELECT agent_id INTO agent_user_id
  FROM property_agents
  WHERE property_id = NEW.property_id
  LIMIT 1;

  IF agent_user_id IS NOT NULL THEN
    NEW.agent_id := agent_user_id;
  END IF;

  -- Determine if property's agency represents the My Rumi platform
  IF property_agency_id IS NOT NULL THEN
    SELECT COALESCE(represents_platform, false) INTO is_rep
    FROM agencies WHERE id = property_agency_id;
  END IF;

  -- If a specific agent is assigned: notify them
  IF agent_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      agent_user_id,
      'New Viewing Request',
      'A viewing has been requested for ' || property_address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time,
      'info'
    );
  END IF;

  -- If property belongs to a My Rumi representative agency, also notify all admins
  IF is_rep THEN
    FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        admin_id,
        'New Viewing Request (My Rumi)',
        'A viewing has been requested for ' || property_address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time,
        'info'
      );
    END LOOP;
  END IF;

  -- Fallback: no agent assigned AND not a rep property → notify all agents + admins (existing behavior)
  IF agent_user_id IS NULL AND NOT is_rep THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT user_id, 'New Viewing Request',
           'A viewing has been requested for ' || property_address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time,
           'info'
    FROM public.profiles
    WHERE role = 'agent' OR role = 'admin';
  END IF;

  RETURN NEW;
END;
$function$;