-- Add foreign key constraint from property_viewings.user_id to profiles.user_id
ALTER TABLE public.property_viewings 
ADD CONSTRAINT property_viewings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;