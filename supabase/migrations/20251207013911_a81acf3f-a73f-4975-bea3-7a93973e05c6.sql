-- Add featured section column to properties table
ALTER TABLE public.properties 
ADD COLUMN featured_section text DEFAULT NULL;

-- Add check constraint for valid featured section values
ALTER TABLE public.properties 
ADD CONSTRAINT valid_featured_section 
CHECK (featured_section IS NULL OR featured_section IN ('featured_rentals', 'properties_for_sale'));