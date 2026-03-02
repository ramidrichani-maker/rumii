
-- Create messages table for viewing confirmation messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  related_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  related_viewing_id uuid REFERENCES public.property_viewings(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages sent to them
CREATE POLICY "Users can view received messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = recipient_user_id);

-- Users can update (mark read) their received messages
CREATE POLICY "Users can update received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_user_id);

-- System/triggers insert messages via security definer functions
CREATE POLICY "Admins can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow service role / triggers to insert
CREATE POLICY "Service can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger function for viewing confirmation
CREATE OR REPLACE FUNCTION public.notify_viewing_confirmed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  prop RECORD;
  viewer RECORD;
  contact_user_id uuid;
  contact_name text;
  contact_phone text;
  confirm_methods text;
  msg_body text;
BEGIN
  -- Only fire when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN

    -- Get property info
    SELECT address, user_id, id INTO prop
    FROM properties WHERE id = NEW.property_id;

    -- Get viewer info
    SELECT full_name INTO viewer
    FROM profiles WHERE user_id = NEW.user_id;

    -- Determine contact person: assigned agent or property lister
    IF NEW.agent_id IS NOT NULL THEN
      SELECT full_name, phone_number INTO contact_name, contact_phone
      FROM profiles WHERE user_id = NEW.agent_id;
      contact_user_id := NEW.agent_id;
    ELSE
      SELECT full_name, phone_number INTO contact_name, contact_phone
      FROM profiles WHERE user_id = prop.user_id;
      contact_user_id := prop.user_id;
    END IF;

    -- Extract confirmation preference from notes
    confirm_methods := COALESCE(NEW.notes, '');

    -- Always send a notification to the user
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Viewing Confirmed',
      'Your viewing for ' || prop.address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time || ' has been confirmed.',
      'viewing'
    );

    -- If phone/message confirmation requested, send message to the contact person
    IF confirm_methods ILIKE '%phone%' THEN
      msg_body := 'Viewing confirmation request from ' || COALESCE(viewer.full_name, 'A user') || '.' || E'\n\n' ||
        'Property: ' || prop.address || E'\n' ||
        'Date: ' || NEW.viewing_date || E'\n' ||
        'Time: ' || NEW.viewing_time || E'\n\n' ||
        'The viewer has requested a phone call confirmation. Please contact them to confirm the viewing.';

      INSERT INTO messages (sender_user_id, recipient_user_id, subject, body, related_property_id, related_viewing_id)
      VALUES (
        NEW.user_id,
        contact_user_id,
        'Viewing Phone Confirmation Request - ' || prop.address,
        msg_body,
        NEW.property_id,
        NEW.id
      );
    END IF;

    -- If email confirmation requested, send notification with contact details
    IF confirm_methods ILIKE '%email%' THEN
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Viewing Details - Contact Information',
        'Your viewing at ' || prop.address || ' on ' || NEW.viewing_date || ' at ' || NEW.viewing_time || ' is confirmed. Contact: ' || COALESCE(contact_name, 'N/A') || ' - ' || COALESCE(contact_phone, 'N/A'),
        'viewing'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_viewing_confirmed
  AFTER UPDATE ON property_viewings
  FOR EACH ROW
  EXECUTE FUNCTION notify_viewing_confirmed();
