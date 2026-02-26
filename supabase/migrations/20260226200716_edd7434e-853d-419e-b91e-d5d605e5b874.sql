
-- Step 1: Create SECURITY DEFINER function to get user's agency_id without hitting profiles RLS
CREATE OR REPLACE FUNCTION public.get_my_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 2: Create SECURITY DEFINER function to check if user is agency manager
CREATE OR REPLACE FUNCTION public.is_agency_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'agency_manager'::user_role
  );
$$;

-- Step 3: Drop ALL existing DELETE policies on properties
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

-- Step 4: Recreate as PERMISSIVE (any one match = allowed)
CREATE POLICY "Admins can delete any property"
ON public.properties FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agency managers can delete their agency properties"
ON public.properties FOR DELETE TO authenticated
USING (
  public.is_agency_manager(auth.uid())
  AND public.get_my_agency_id() IS NOT NULL
  AND public.get_my_agency_id() = agency_id
);

CREATE POLICY "Agents can delete assigned properties"
ON public.properties FOR DELETE TO authenticated
USING (auth.uid() IN (
  SELECT pa.agent_id FROM public.property_agents pa
  WHERE pa.property_id = properties.id
));

CREATE POLICY "Users can delete own approved properties"
ON public.properties FOR DELETE TO authenticated
USING (auth.uid() = user_id AND status = 'approved'::property_status);
