-- Migration 014: Fuzzy search via pg_trgm + combined ranking with tsvector

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
  ON businesses USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_businesses_description_trgm
  ON businesses USING GIN (description gin_trgm_ops);
