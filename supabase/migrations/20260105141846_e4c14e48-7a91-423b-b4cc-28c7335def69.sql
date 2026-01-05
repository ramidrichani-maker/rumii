-- Create agencies table
CREATE TABLE public.agencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Anyone can view agencies
CREATE POLICY "Anyone can view agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage agencies
CREATE POLICY "Admins can insert agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete agencies"
ON public.agencies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add agency_id to profiles table for agents
ALTER TABLE public.profiles ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();