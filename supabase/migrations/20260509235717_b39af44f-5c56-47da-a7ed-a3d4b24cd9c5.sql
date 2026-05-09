-- Restrict realtime broadcast on properties to exclude exact coordinates
ALTER PUBLICATION supabase_realtime DROP TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties (
  id, user_id, city, address, property_type, square_meters, bedrooms, bathrooms,
  listing_type, price, amenities, images, status, year_built, last_renovated,
  created_at, updated_at, municipality, property_code, price_negotiable,
  featured_section, agency_id, unfurnished, floors, apartments_count,
  description, floor_plan_url, rental_price, floor_plan_urls
);

-- Enable Realtime channel authorization: require authentication to subscribe.
-- realtime.messages already has RLS enabled by Supabase; add a default-deny + auth policy.
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can use realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);