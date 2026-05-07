CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id FROM public.profiles WHERE role = 'admin'::user_role;
$$;