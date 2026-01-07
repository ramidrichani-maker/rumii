-- Add agency_id column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);

-- Create featured_requests table for agencies to request featuring their properties
CREATE TABLE IF NOT EXISTS public.featured_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on featured_requests
ALTER TABLE public.featured_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for featured_requests
CREATE POLICY "Agency managers can create feature requests for their agency"
ON public.featured_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = featured_requests.agency_id
    AND profiles.role = 'agency_manager'
  )
);

CREATE POLICY "Agency managers can view their agency feature requests"
ON public.featured_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = featured_requests.agency_id
    AND profiles.role = 'agency_manager'
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update feature requests"
ON public.featured_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feature requests"
ON public.featured_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Update properties RLS to allow agency managers to view/manage their agency properties
CREATE POLICY "Agency managers can view their agency properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = properties.agency_id
    AND profiles.role = 'agency_manager'
  )
);

CREATE POLICY "Agency managers can update their agency properties"
ON public.properties
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = properties.agency_id
    AND profiles.role = 'agency_manager'
  )
);

CREATE POLICY "Agency managers can delete their agency properties"
ON public.properties
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = properties.agency_id
    AND profiles.role = 'agency_manager'
  )
);

-- Allow agency managers to view viewings for their agency's properties
CREATE POLICY "Agency managers can view agency property viewings"
ON public.property_viewings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.profiles prof ON prof.agency_id = p.agency_id
    WHERE p.id = property_viewings.property_id
    AND prof.user_id = auth.uid()
    AND prof.role = 'agency_manager'
  )
);

-- Allow agency managers to manage property agent assignments for their agency properties
CREATE POLICY "Agency managers can manage property agent assignments"
ON public.property_agents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.profiles prof ON prof.agency_id = p.agency_id
    WHERE p.id = property_agents.property_id
    AND prof.user_id = auth.uid()
    AND prof.role = 'agency_manager'
  )
);

-- Update trigger for featured_requests
CREATE TRIGGER update_featured_requests_updated_at
BEFORE UPDATE ON public.featured_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();