CREATE TABLE public.commercial_advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  property_type text NOT NULL,
  listing_type text NOT NULL,
  address text NOT NULL,
  city text,
  municipality text,
  size_sqm numeric,
  price numeric,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_advertisements TO authenticated;
GRANT ALL ON public.commercial_advertisements TO service_role;

ALTER TABLE public.commercial_advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit commercial ad requests"
  ON public.commercial_advertisements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own commercial ad requests"
  ON public.commercial_advertisements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update commercial ad requests"
  ON public.commercial_advertisements
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete commercial ad requests"
  ON public.commercial_advertisements
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER set_commercial_ads_updated_at
  BEFORE UPDATE ON public.commercial_advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();