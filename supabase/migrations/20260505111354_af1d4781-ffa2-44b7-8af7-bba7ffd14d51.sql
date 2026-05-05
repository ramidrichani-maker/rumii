-- Allow anonymous (not signed-in) visitors to submit property enquiries.
-- Authenticated users continue to be allowed; their sender_user_id must match auth.uid().
DROP POLICY IF EXISTS "Authenticated users can create enquiries" ON public.property_enquiries;

CREATE POLICY "Anyone can create enquiries"
ON public.property_enquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND sender_user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND (sender_user_id = auth.uid() OR sender_user_id IS NULL))
);