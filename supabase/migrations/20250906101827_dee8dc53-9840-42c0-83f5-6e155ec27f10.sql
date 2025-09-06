-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create policies for property images storage
CREATE POLICY "Property images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Users can upload their own property images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own property images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own property images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-images' 
  AND auth.uid() IS NOT NULL
);