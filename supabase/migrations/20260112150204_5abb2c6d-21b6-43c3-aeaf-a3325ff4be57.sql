-- Fix: Remove overly permissive notifications INSERT policy
-- The current policy allows any authenticated user to insert notifications for any user

-- Drop the permissive policy
DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;

-- Create new policy: Only admins can directly insert notifications
-- Note: SECURITY DEFINER trigger functions (like notify_agent_viewing_request, 
-- notify_property_status_change, notify_admin_property_pending) bypass RLS,
-- so they will continue to work without needing an INSERT policy
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));