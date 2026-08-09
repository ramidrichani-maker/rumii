ALTER TABLE public.investment_projects
  ADD COLUMN IF NOT EXISTS invested_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.investment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.investment_projects(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  amount numeric,
  message text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.investment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_requests TO authenticated;
GRANT ALL ON public.investment_requests TO service_role;

ALTER TABLE public.investment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create investment requests"
  ON public.investment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own investment requests"
  ON public.investment_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update investment requests"
  ON public.investment_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete investment requests"
  ON public.investment_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_investment_requests_updated_at
  BEFORE UPDATE ON public.investment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();