-- set_updated_at() may already exist from migration 005; create if not
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE business_suggestions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER suggestions_updated_at
  BEFORE UPDATE ON business_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
