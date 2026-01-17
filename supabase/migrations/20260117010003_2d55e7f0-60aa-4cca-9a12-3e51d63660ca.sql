-- Add room_type column to property_generated_images for categorizing AI designs
ALTER TABLE public.property_generated_images 
ADD COLUMN IF NOT EXISTS room_type TEXT;

-- Add room_type to the index for efficient lookup
DROP INDEX IF EXISTS idx_property_generated_images_approved_style_palette;
CREATE INDEX idx_property_generated_images_lookup 
ON public.property_generated_images(property_id, approved, style, palette, room_type) 
WHERE approved = true;

-- Add delete policy for admins on property_generated_images
CREATE POLICY "property_generated_images_delete_admin"
ON public.property_generated_images
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));