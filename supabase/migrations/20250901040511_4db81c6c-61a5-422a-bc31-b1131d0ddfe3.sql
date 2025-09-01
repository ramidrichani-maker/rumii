-- Add foreign key relationship between properties and profiles
ALTER TABLE public.properties 
ADD CONSTRAINT fk_properties_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;