-- Add style and palette columns to property_generated_images for matching designs
ALTER TABLE public.property_generated_images 
ADD COLUMN IF NOT EXISTS style TEXT,
ADD COLUMN IF NOT EXISTS palette TEXT;

-- Create index for efficient lookup of approved designs by style/palette
CREATE INDEX IF NOT EXISTS idx_property_generated_images_approved_style_palette 
ON public.property_generated_images(property_id, approved, style, palette) 
WHERE approved = true;