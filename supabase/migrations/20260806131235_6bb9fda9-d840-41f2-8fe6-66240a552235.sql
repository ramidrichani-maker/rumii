ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS investment_worthy boolean NOT NULL DEFAULT false;

CREATE TABLE public.investment_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  project_type text NOT NULL DEFAULT 'building',
  description text,
  address text NOT NULL,
  city text NOT NULL,
  municipality text,
  latitude numeric,
  longitude numeric,
  total_price numeric,
  currency text NOT NULL DEFAULT 'USD',
  land_area_sqm numeric,
  built_area_sqm numeric,
  units_count integer,
  floors integer,
  bedrooms integer,
  bathrooms integer,
  year_built integer,
  completion_status text,
  expected_roi numeric,
  amenities text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.investment_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_projects TO authenticated;
GRANT ALL ON public.investment_projects TO service_role;

ALTER TABLE public.investment_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published investment projects"
ON public.investment_projects FOR SELECT
USING (published = true OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can insert investment projects"
ON public.investment_projects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update investment projects"
ON public.investment_projects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete investment projects"
ON public.investment_projects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_investment_projects_updated_at
BEFORE UPDATE ON public.investment_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();