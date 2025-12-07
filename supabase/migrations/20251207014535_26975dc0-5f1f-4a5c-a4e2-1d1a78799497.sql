-- Change bathrooms column from integer to numeric to support decimal values like 0.5, 1.5, etc.
ALTER TABLE public.properties 
ALTER COLUMN bathrooms TYPE numeric USING bathrooms::numeric;