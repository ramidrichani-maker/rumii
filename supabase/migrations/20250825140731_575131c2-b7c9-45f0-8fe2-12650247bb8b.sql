-- Add coordinates to properties table
ALTER TABLE public.properties 
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric;

-- Create function to notify admin when property is created
CREATE OR REPLACE FUNCTION public.notify_admin_property_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get admin user IDs
  FOR admin_user_id IN 
    SELECT user_id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_user_id,
      'New Property Pending Approval',
      'A new property at ' || NEW.address || ' has been submitted and requires your approval.',
      'info'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for property creation
CREATE TRIGGER notify_admin_on_property_creation
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_property_pending();