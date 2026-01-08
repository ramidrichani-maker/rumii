-- Allow admins to insert featured requests
CREATE POLICY "Admins can insert feature requests"
ON public.featured_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to view all featured requests (explicit policy)
CREATE POLICY "Admins can view all feature requests"
ON public.featured_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to insert property agent assignments
CREATE POLICY "Admins can insert property agent assignments"
ON public.property_agents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to delete property viewings
CREATE POLICY "Admins can delete property viewings"
ON public.property_viewings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to insert property viewings
CREATE POLICY "Admins can insert property viewings"
ON public.property_viewings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to update any property viewing
CREATE POLICY "Admins can update all property viewings"
ON public.property_viewings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to view all property viewings
CREATE POLICY "Admins can view all property viewings"
ON public.property_viewings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to insert properties
CREATE POLICY "Admins can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));