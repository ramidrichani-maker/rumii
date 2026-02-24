
-- Create table for property enquiries
CREATE TABLE public.property_enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID,
  agency_id UUID REFERENCES public.agencies(id),
  sender_user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT,
  wants_viewing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_enquiries ENABLE ROW LEVEL SECURITY;

-- Agents can view enquiries for their assigned properties
CREATE POLICY "Agents can view enquiries for assigned properties"
ON public.property_enquiries FOR SELECT
USING (
  agent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM property_agents pa
    WHERE pa.property_id = property_enquiries.property_id
    AND pa.agent_id = auth.uid()
  )
);

-- Agency managers can view enquiries for their agency
CREATE POLICY "Agency managers can view agency enquiries"
ON public.property_enquiries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = property_enquiries.agency_id
    AND profiles.role = 'agency_manager'
  )
);

-- Admins can view all enquiries
CREATE POLICY "Admins can view all enquiries"
ON public.property_enquiries FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Anyone (authenticated or not) can create enquiries
CREATE POLICY "Anyone can create enquiries"
ON public.property_enquiries FOR INSERT
WITH CHECK (true);
