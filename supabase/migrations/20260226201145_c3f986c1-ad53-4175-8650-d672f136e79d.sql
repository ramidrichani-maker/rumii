
-- Create SECURITY DEFINER function to check if user is assigned agent for a property
-- This bypasses RLS on property_agents (which has policies referencing properties, causing recursion)
CREATE OR REPLACE FUNCTION public.is_assigned_agent(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_agents
    WHERE agent_id = _user_id AND property_id = _property_id
  );
$$;

-- Drop all existing DELETE policies on properties
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

-- Recreate DELETE policies using only SECURITY DEFINER functions (no cross-table RLS triggers)
CREATE POLICY "Admins can delete any property"
ON public.properties FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agency managers can delete their agency properties"
ON public.properties FOR DELETE TO authenticated
USING (
  public.is_agency_manager(auth.uid())
  AND public.get_my_agency_id() = agency_id
);

CREATE POLICY "Agents can delete assigned properties"
ON public.properties FOR DELETE TO authenticated
USING (public.is_assigned_agent(auth.uid(), id));

CREATE POLICY "Users can delete own approved properties"
ON public.properties FOR DELETE TO authenticated
USING (auth.uid() = user_id AND status = 'approved'::property_status);

-- Also fix the SELECT policy for agency managers on properties to avoid recursion
DROP POLICY IF EXISTS "Agency managers can view their agency properties" ON public.properties;
CREATE POLICY "Agency managers can view their agency properties"
ON public.properties FOR SELECT TO authenticated
USING (
  public.is_agency_manager(auth.uid())
  AND public.get_my_agency_id() = agency_id
);

-- Also fix the UPDATE policy for agency managers on properties
DROP POLICY IF EXISTS "Agency managers can update their agency properties" ON public.properties;
CREATE POLICY "Agency managers can update their agency properties"
ON public.properties FOR UPDATE TO authenticated
USING (
  public.is_agency_manager(auth.uid())
  AND public.get_my_agency_id() = agency_id
);
