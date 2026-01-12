-- Fix Security Issue 1: user_sessions RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin/agent can read sessions" ON user_sessions;
DROP POLICY IF EXISTS "admin can delete sessions" ON user_sessions;
DROP POLICY IF EXISTS "app can insert sessions" ON user_sessions;

-- Create proper policies using has_role() function
CREATE POLICY "Users can view own sessions"
ON user_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
ON user_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view all sessions"
ON user_sessions FOR SELECT
USING (has_role(auth.uid(), 'agent'));

CREATE POLICY "Admins can delete sessions"
ON user_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Restrict INSERT to only allow creating your own sessions
CREATE POLICY "Users can create own sessions"
ON user_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Fix Security Issue 2: approve_property_media function - add admin check
CREATE OR REPLACE FUNCTION public.approve_property_media(media_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  media_record RECORD;
BEGIN
  -- CHECK CALLER IS ADMIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve media';
  END IF;
  
  -- Get the media record
  SELECT * INTO media_record FROM property_media_pending WHERE id = media_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media not found';
  END IF;
  
  -- Add media URL to property images array
  UPDATE properties
  SET images = array_append(images, media_record.media_url),
      updated_at = now()
  WHERE id = media_record.property_id;
  
  -- Mark as approved
  UPDATE property_media_pending
  SET status = 'approved', updated_at = now()
  WHERE id = media_id;
  
  RETURN TRUE;
END;
$$;

-- Fix Security Issue 3: Storage policies - enforce user-specific paths
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can upload their own property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;

-- Create strict user-scoped policies that enforce folder ownership
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin policies for full management access
CREATE POLICY "Admins can manage all images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'property-images'
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'property-images'
  AND has_role(auth.uid(), 'admin')
);