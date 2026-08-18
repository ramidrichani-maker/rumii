
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Helpers required for row-level security policy evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agency_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_manager(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_agent(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO anon, authenticated;

-- Routines the signed-in app calls directly (each performs its own authorization check)
GRANT EXECUTE ON FUNCTION public.approve_property_media(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_support_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_new_users_analytics(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_analytics(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_coords(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_user_session(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_user_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, user_role, uuid) TO authenticated;
