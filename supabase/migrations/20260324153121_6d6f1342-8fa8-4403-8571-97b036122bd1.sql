
CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id uuid, _admin_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the admin making the change has admin role
  IF NOT has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Prevent deletion of admin users (safety measure)
  IF has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'Cannot delete admin users';
  END IF;
  
  -- Delete user profile first
  DELETE FROM public.profiles WHERE user_id = _user_id;
  
  -- Delete from auth.users so the email is freed up for re-registration
  DELETE FROM auth.users WHERE id = _user_id;
  
  RETURN FOUND;
END;
$function$;
