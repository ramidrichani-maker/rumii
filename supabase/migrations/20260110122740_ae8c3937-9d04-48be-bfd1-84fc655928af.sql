-- Create function to get user by email for agent assignment
CREATE OR REPLACE FUNCTION public.get_agent_by_email(_email text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.full_name
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = _email
    AND p.role IN ('agent', 'admin');
END;
$$;