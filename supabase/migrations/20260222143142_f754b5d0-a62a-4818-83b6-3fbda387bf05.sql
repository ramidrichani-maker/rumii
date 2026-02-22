
-- Drop the existing restrictive admin delete policy
DROP POLICY IF EXISTS "Admins can delete any property" ON public.properties;

-- Recreate as a PERMISSIVE policy so admins can actually delete
CREATE POLICY "Admins can delete any property"
ON public.properties
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));
