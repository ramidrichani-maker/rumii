ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'both';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rental_price numeric;