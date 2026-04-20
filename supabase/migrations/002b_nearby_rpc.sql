CREATE OR REPLACE FUNCTION businesses_nearby(
  user_lat  FLOAT,
  user_lng  FLOAT,
  city      TEXT,
  radius_m  FLOAT DEFAULT 8047
)
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  category             TEXT,
  address              TEXT,
  city                 TEXT,
  state                TEXT,
  zip                  TEXT,
  description          TEXT,
  phone                TEXT,
  website              TEXT,
  verified             BOOLEAN,
  featured             BOOLEAN,
  woman_owned          BOOLEAN,
  logo_url             TEXT,
  business_type        TEXT,
  is_address_public    BOOLEAN,
  public_location_label TEXT,
  service_area         TEXT,
  latitude             FLOAT,
  longitude            FLOAT,
  is_archived          BOOLEAN,
  dist_meters          FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    b.name,
    b.category,
    b.address,
    b.city,
    b.state,
    b.zip,
    b.description,
    b.phone,
    b.website,
    b.verified,
    b.featured,
    b.woman_owned,
    b.logo_url,
    b.business_type,
    b.is_address_public,
    b.public_location_label,
    b.service_area,
    b.latitude,
    b.longitude,
    b.is_archived,
    ST_Distance(
      b.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS dist_meters
  FROM businesses b
  WHERE
    b.city ILIKE businesses_nearby.city
    AND b.verified = true
    AND (b.is_archived IS NULL OR b.is_archived = false)
    AND b.location IS NOT NULL
    AND ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_m
    )
  ORDER BY dist_meters ASC;
$$;
