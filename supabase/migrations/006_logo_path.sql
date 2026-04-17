-- Add logo_path column to businesses and backfill from existing logo_url values.
-- logo_path stores only the storage-relative path (e.g. "uuid/logo.png"),
-- not the full public URL — per audit finding #6.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_path TEXT;

UPDATE businesses
SET logo_path = regexp_replace(logo_url, '^.*business-logos/', '')
WHERE logo_url IS NOT NULL
  AND logo_url LIKE '%business-logos/%';
