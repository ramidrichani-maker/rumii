-- Add role update capabilities and municipality changes
-- First, change district to municipality in properties table
ALTER TABLE public.properties RENAME COLUMN district TO municipality;

-- Add function to update user roles (only main admin can change roles)
CREATE OR REPLACE FUNCTION public.update_user_role(_user_id uuid, _new_role user_role, _admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the admin making the change has admin role
  IF NOT has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  -- Update the user role
  UPDATE public.profiles 
  SET role = _new_role, updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Add function to delete users (admin only)
CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id uuid, _admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the admin making the change has admin role
  IF NOT has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Prevent deletion of admin users (safety measure)
  IF has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'Cannot delete admin users';
  END IF;
  
  -- Delete user profile (this will cascade to auth.users due to foreign key)
  DELETE FROM public.profiles WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;