-- Add unfurnished column to properties table
ALTER TABLE public.properties ADD COLUMN unfurnished boolean NOT NULL DEFAULT false;