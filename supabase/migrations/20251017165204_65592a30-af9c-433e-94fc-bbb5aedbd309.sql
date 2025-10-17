-- Create table for pending property media additions
CREATE TABLE IF NOT EXISTS property_media_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_media_pending ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending media
CREATE POLICY "Users can view own pending media"
  ON property_media_pending FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert pending media for their properties
CREATE POLICY "Users can add pending media to own properties"
  ON property_media_pending FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = property_id 
      AND properties.user_id = auth.uid()
    )
  );

-- Admins can view all pending media
CREATE POLICY "Admins can view all pending media"
  ON property_media_pending FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update pending media status
CREATE POLICY "Admins can update pending media"
  ON property_media_pending FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete pending media
CREATE POLICY "Admins can delete pending media"
  ON property_media_pending FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Users can delete their own approved listings
CREATE POLICY "Users can delete own approved properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id AND status = 'approved');

-- Trigger to update updated_at
CREATE TRIGGER update_property_media_pending_updated_at
  BEFORE UPDATE ON property_media_pending
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to approve media and add to property
CREATE OR REPLACE FUNCTION approve_property_media(media_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  media_record RECORD;
BEGIN
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