ALTER TABLE public.featured_requests ALTER COLUMN agency_id DROP NOT NULL;

CREATE POLICY "Property owners can create feature requests"
ON public.featured_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = featured_requests.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can view their feature requests"
ON public.featured_requests
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = featured_requests.property_id
      AND p.user_id = auth.uid()
  )
);