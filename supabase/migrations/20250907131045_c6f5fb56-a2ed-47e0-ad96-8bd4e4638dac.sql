-- Create viewing_status enum
CREATE TYPE viewing_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create property_viewings table
CREATE TABLE public.property_viewings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agent_id UUID NULL REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  viewing_date DATE NOT NULL,
  viewing_time TIME NOT NULL,
  status viewing_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, viewing_date, viewing_time)
);

-- Enable RLS on property_viewings
ALTER TABLE public.property_viewings ENABLE ROW LEVEL SECURITY;

-- Create policies for property_viewings
CREATE POLICY "Users can view their own viewing requests"
ON public.property_viewings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create viewing requests"
ON public.property_viewings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own viewing requests"
ON public.property_viewings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Agents can view assigned viewings"
ON public.property_viewings
FOR SELECT
USING (auth.uid() = agent_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can update assigned viewings"
ON public.property_viewings
FOR UPDATE
USING (auth.uid() = agent_id OR has_role(auth.uid(), 'admin'));

-- Create property_agents table to assign agents to properties
CREATE TABLE public.property_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, agent_id)
);

-- Enable RLS on property_agents
ALTER TABLE public.property_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for property_agents
CREATE POLICY "Agents can view their property assignments"
ON public.property_agents
FOR SELECT
USING (auth.uid() = agent_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage property agent assignments"
ON public.property_agents
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for viewing notifications
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
  
  -- Get assigned agent for the property
  SELECT agent_id INTO agent_user_id
  FROM property_agents
  WHERE property_id = NEW.property_id
  LIMIT 1;
  
  -- If no specific agent assigned, notify all agents
  IF agent_user_id IS NULL THEN
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

-- Create trigger for viewing notifications
CREATE TRIGGER on_viewing_request_created
  AFTER INSERT ON public.property_viewings
  FOR EACH ROW
  EXECUTE FUNCTION notify_agent_viewing_request();

-- Add trigger for updated_at column
CREATE TRIGGER update_property_viewings_updated_at
  BEFORE UPDATE ON public.property_viewings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update profiles table to include agent role if not already present
-- (This assumes the user_role enum already exists and includes 'agent')
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agent';