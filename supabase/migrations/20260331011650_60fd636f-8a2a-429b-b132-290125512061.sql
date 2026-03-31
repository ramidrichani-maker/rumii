
CREATE TABLE public.saved_search_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Saved Area',
  coordinates jsonb NOT NULL,
  page text NOT NULL DEFAULT 'purchase',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_search_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved areas"
  ON public.saved_search_areas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create saved areas"
  ON public.saved_search_areas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved areas"
  ON public.saved_search_areas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
