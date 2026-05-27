GRANT SELECT ON public.agencies TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view agencies" ON public.agencies;

CREATE POLICY "Anyone can view agencies"
ON public.agencies
FOR SELECT
TO anon, authenticated
USING (true);