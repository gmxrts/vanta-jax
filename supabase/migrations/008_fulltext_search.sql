-- Full-text search vector on businesses.
-- Concatenates name, description, category, and city into a searchable tsvector.
-- GIN index enables fast @@ queries via Supabase .textSearch().

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector(
        'english',
        coalesce(name, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(city, '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses USING GIN(search_vector);
