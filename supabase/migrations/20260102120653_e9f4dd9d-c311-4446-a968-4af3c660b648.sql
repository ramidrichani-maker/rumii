-- Create photography_requests table for customers to request photography services
CREATE TABLE public.photography_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  property_address TEXT NOT NULL,
  city TEXT NOT NULL,
  municipality TEXT,
  property_type TEXT NOT NULL,
  property_size_sqm INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  preferred_date DATE,
  preferred_time TEXT,
  special_requirements TEXT,
  full_service_listing BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_agent_id UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.photography_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create photography requests"
ON public.photography_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own photography requests"
ON public.photography_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all photography requests"
ON public.photography_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all requests
CREATE POLICY "Admins can update photography requests"
ON public.photography_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete requests
CREATE POLICY "Admins can delete photography requests"
ON public.photography_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_photography_requests_updated_at
BEFORE UPDATE ON public.photography_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();