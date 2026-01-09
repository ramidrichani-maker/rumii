-- Create a table for service pricing settings
CREATE TABLE public.service_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings (prices are public info)
CREATE POLICY "Anyone can view service settings"
ON public.service_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert service settings"
ON public.service_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update service settings"
ON public.service_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete service settings"
ON public.service_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Insert default pricing
INSERT INTO public.service_settings (key, value, description) VALUES
  ('featured_listing_sale_price', 0, 'Price for featuring a property for sale'),
  ('featured_listing_rent_price', 0, 'Price for featuring a rental property');

-- Add trigger for updated_at
CREATE TRIGGER update_service_settings_updated_at
BEFORE UPDATE ON public.service_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();