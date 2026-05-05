
ALTER TABLE public.properties
  ALTER COLUMN bathrooms TYPE integer USING ROUND(bathrooms)::integer;

ALTER TABLE public.photography_requests
  ALTER COLUMN bathrooms TYPE integer USING ROUND(bathrooms)::integer;

ALTER TABLE public.valuation_requests
  ALTER COLUMN bathrooms TYPE integer USING ROUND(bathrooms)::integer;
