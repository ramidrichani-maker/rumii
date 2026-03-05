
CREATE TABLE public.valuation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  property_address text NOT NULL,
  city text NOT NULL,
  municipality text,
  property_type text NOT NULL,
  bedrooms integer,
  bathrooms numeric,
  square_meters integer,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  additional_notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  assigned_agent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.valuation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create valuation requests" ON public.valuation_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own valuation requests" ON public.valuation_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all valuation requests" ON public.valuation_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update valuation requests" ON public.valuation_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete valuation requests" ON public.valuation_requests
  FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));
