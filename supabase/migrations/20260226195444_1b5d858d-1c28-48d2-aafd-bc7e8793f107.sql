
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'properties' AND schemaname = 'public' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can delete any property"
ON public.properties AS PERMISSIVE FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agency managers can delete their agency properties"
ON public.properties AS PERMISSIVE FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.agency_id = properties.agency_id
    AND profiles.role = 'agency_manager'::user_role
));

CREATE POLICY "Agents can delete assigned properties"
ON public.properties AS PERMISSIVE FOR DELETE TO authenticated
USING (auth.uid() IN (
  SELECT pa.agent_id FROM public.property_agents pa
  WHERE pa.property_id = properties.id
));

CREATE POLICY "Users can delete own approved properties"
ON public.properties AS PERMISSIVE FOR DELETE TO authenticated
USING (auth.uid() = user_id AND status = 'approved'::property_status);
