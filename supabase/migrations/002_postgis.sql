-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Backfill from existing lat/lng columns
UPDATE businesses
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Spatial index
CREATE INDEX IF NOT EXISTS businesses_location_idx
  ON businesses USING GIST (location);
