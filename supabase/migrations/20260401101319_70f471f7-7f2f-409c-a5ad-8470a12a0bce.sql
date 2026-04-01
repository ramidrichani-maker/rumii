
-- 1. Fix profiles UPDATE policy to prevent role escalation
-- Replace the permissive update policy with one that prevents role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()));

-- 2. Add SELECT policy for enquiry senders to view their own enquiries
CREATE POLICY "Users can view own enquiries"
ON public.property_enquiries FOR SELECT
TO authenticated
USING (sender_user_id = auth.uid());

-- 3. Restrict property_enquiries INSERT to require sender_user_id match
DROP POLICY IF EXISTS "Anyone can create enquiries" ON public.property_enquiries;

CREATE POLICY "Authenticated users can create enquiries"
ON public.property_enquiries FOR INSERT
TO authenticated
WITH CHECK (sender_user_id = auth.uid() OR sender_user_id IS NULL);

-- 4. Fix property_ai_jobs admin policy to use has_role instead of JWT claim
DROP POLICY IF EXISTS "property_ai_jobs_admin_all" ON public.property_ai_jobs;

CREATE POLICY "property_ai_jobs_admin_all"
ON public.property_ai_jobs FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
