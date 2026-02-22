
-- Drop ALL existing DELETE policies on properties
DROP POLICY IF EXISTS "Admins can delete any property" ON public.properties;
DROP POLICY IF EXISTS "Agency managers can delete their agency properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can delete assigned properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own approved properties" ON public.properties;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can delete any property"
ON public.properties FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agency managers can delete their agency properties"
ON public.properties FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.agency_id = properties.agency_id
      AND profiles.role = 'agency_manager'::user_role
  )
);

CREATE POLICY "Agents can delete assigned properties"
ON public.properties FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT property_agents.agent_id
    FROM property_agents
    WHERE property_agents.property_id = properties.id
  )
);

CREATE POLICY "Users can delete own approved properties"
ON public.properties FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'approved'::property_status);
