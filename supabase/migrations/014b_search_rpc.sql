-- Migration 014b: search_businesses RPC combining trigram fuzzy + tsvector full-text

CREATE OR REPLACE FUNCTION search_businesses(
  query         TEXT,
  city_name     TEXT,
  category      TEXT    DEFAULT NULL,
  verified_only BOOLEAN DEFAULT FALSE,
  woman_owned   BOOLEAN DEFAULT FALSE
)
RETURNS SETOF businesses
LANGUAGE sql
STABLE
AS $$
  SELECT b.*
  FROM businesses b
  WHERE
    b.city = city_name
    AND b.is_archived = FALSE
    AND (
      similarity(b.name, query) > 0.15
      OR b.search_vector @@ plainto_tsquery('english', query)
    )
    AND (category IS NULL OR b.category = category)
    AND (NOT verified_only OR b.verified = TRUE)
    AND (NOT woman_owned OR b.woman_owned = TRUE)
  ORDER BY (
    similarity(b.name, query) * 2
    + ts_rank(b.search_vector, plainto_tsquery('english', query))
  ) DESC;
$$;
