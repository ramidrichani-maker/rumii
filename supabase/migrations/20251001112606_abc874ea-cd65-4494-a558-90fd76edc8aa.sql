-- Update the trigger to automatically assign agent_id when viewing is created
CREATE OR REPLACE FUNCTION notify_agent_viewing_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  property_address text;
  agent_user_id uuid;
BEGIN
  -- Get property address
  SELECT address INTO property_address
  FROM properties
  WHERE id = NEW.property_id;
  
  -- Get assigned agent for the property and set it on the viewing
  SELECT agent_id INTO agent_user_id
  FROM property_agents
  WHERE property_id = NEW.property_id
  LIMIT 1;
  
  -- Set the agent_id on the viewing record
  IF agent_user_id IS NOT NULL THEN
    NEW.agent_id := agent_user_id;
  END IF;
  
  -- Send notifications
  IF agent_user_id IS NULL THEN
    -- If no specific agent assigned, notify all agents
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT user_id, 'New Viewing Request', 
           'A viewing has been requested for ' || property_address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time,
           'info'
    FROM public.profiles
    WHERE role = 'agent' OR role = 'admin';
  ELSE
    -- Notify the assigned agent
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      agent_user_id,
      'New Viewing Request',
      'A viewing has been requested for ' || property_address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time,
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add policy for agents to see viewings for their assigned properties
CREATE POLICY "Agents can view viewings for assigned properties"
ON public.property_viewings
FOR SELECT
USING (
  auth.uid() IN (
    SELECT agent_id 
    FROM property_agents 
    WHERE property_id = property_viewings.property_id
  ) OR has_role(auth.uid(), 'admin')
);