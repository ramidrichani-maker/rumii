-- Add price_negotiable column to properties table
ALTER TABLE properties
ADD COLUMN price_negotiable boolean DEFAULT false;