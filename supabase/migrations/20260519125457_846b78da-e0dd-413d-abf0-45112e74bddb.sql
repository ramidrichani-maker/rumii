
CREATE OR REPLACE VIEW public.properties_public AS
SELECT id,
    user_id,
    address,
    city,
    municipality,
    property_type,
    listing_type,
    bedrooms,
    bathrooms,
    square_meters,
    floors,
    price,
    rental_price,
    price_negotiable,
    images,
    amenities,
    description,
    floor_plan_url,
    floor_plan_urls,
    unfurnished,
    year_built,
    last_renovated,
    apartments_count,
    agency_id,
    featured_section,
    property_code,
    status,
    created_at,
    updated_at,
    CASE
        WHEN auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role)) THEN latitude
        ELSE public.jitter_coord(id, COALESCE(latitude, 33.8938), 'lat'::text)
    END AS latitude,
    CASE
        WHEN auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role)) THEN longitude
        ELSE public.jitter_coord(id, COALESCE(longitude, 35.5018), 'lng'::text)
    END AS longitude,
    parent_property_id
FROM public.properties p
WHERE status = 'approved'::property_status;
