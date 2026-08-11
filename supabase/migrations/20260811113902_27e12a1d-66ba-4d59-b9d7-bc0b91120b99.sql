CREATE TABLE public.interior_design_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  property_address text NOT NULL,
  city text NOT NULL,
  municipality text,
  property_type text NOT NULL,
  property_size_sqm integer,
  rooms_count integer,
  preferred_date date,
  preferred_time text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  rescheduled_date date,
  rescheduled_time text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.interior_design_requests TO authenticated;
GRANT ALL ON public.interior_design_requests TO service_role;

ALTER TABLE public.interior_design_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own interior design requests"
ON public.interior_design_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interior design requests"
ON public.interior_design_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update interior design requests"
ON public.interior_design_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete interior design requests"
ON public.interior_design_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

GRANT UPDATE, DELETE ON public.interior_design_requests TO authenticated;

CREATE TRIGGER update_interior_design_requests_updated_at
BEFORE UPDATE ON public.interior_design_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();