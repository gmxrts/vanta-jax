-- Suggestion status enum
CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_suggestions' AND column_name = 'status'
  ) THEN
    UPDATE business_suggestions SET status = 'pending' WHERE status IS NULL;
    ALTER TABLE business_suggestions ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE business_suggestions
      ALTER COLUMN status TYPE suggestion_status USING status::suggestion_status;
    ALTER TABLE business_suggestions ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE business_suggestions ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE business_suggestions
      ADD COLUMN status suggestion_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Claim status enum
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_claims' AND column_name = 'status'
  ) THEN
    UPDATE business_claims SET status = 'pending' WHERE status IS NULL;
    ALTER TABLE business_claims ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE business_claims
      ALTER COLUMN status TYPE claim_status USING status::claim_status;
    ALTER TABLE business_claims ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE business_claims ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE business_claims
      ADD COLUMN status claim_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;
