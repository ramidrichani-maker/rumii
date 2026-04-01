
-- 1. Remove overly permissive agent access to user_sessions
DROP POLICY IF EXISTS "Agents can view all sessions" ON public.user_sessions;

-- 2. Fix property_generated_images INSERT policy (remove unauthenticated access)
DROP POLICY IF EXISTS "property_generated_images_insert_service_or_owner" ON public.property_generated_images;
CREATE POLICY "property_generated_images_insert_owner"
ON public.property_generated_images FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = property_generated_images.property_id
    AND p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- 3. Fix property_generated_images SELECT policy to use has_role instead of JWT claim
DROP POLICY IF EXISTS "property_generated_images_select_owner" ON public.property_generated_images;
CREATE POLICY "property_generated_images_select_owner"
ON public.property_generated_images FOR SELECT
TO authenticated
USING (
  approved = true
  OR EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = property_generated_images.property_id
    AND p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- 4. Fix property_generated_images UPDATE policy to use has_role
DROP POLICY IF EXISTS "property_generated_images_update_admin" ON public.property_generated_images;
CREATE POLICY "property_generated_images_update_admin"
ON public.property_generated_images FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- 5. Fix get_user_role() no-arg function to include search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 6. Add RLS policies for ai-generated storage bucket
CREATE POLICY "Public can view AI generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-generated');

CREATE POLICY "Admins can upload AI images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ai-generated'
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can delete AI images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ai-generated'
  AND has_role(auth.uid(), 'admin'::user_role)
);
