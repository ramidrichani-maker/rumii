-- Drop the previous foreign key constraint
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS fk_properties_user_id;

-- Add proper foreign key relationship to profiles table via user_id
-- Since profiles.user_id references auth.users(id), this creates the proper chain
-- properties.user_id -> auth.users(id) (where profiles.user_id also references auth.users(id))

-- First, let's ensure all existing properties have valid user_ids that exist in auth.users
-- No action needed here as the constraint should work with existing data

-- Add foreign key constraint to auth.users for now
ALTER TABLE public.properties 
ADD CONSTRAINT fk_properties_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;