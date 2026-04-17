-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  slug       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  icon_slug  TEXT,
  sort_order INT DEFAULT 0
);

-- Seed categories
INSERT INTO categories (slug, label, icon_slug, sort_order) VALUES
  ('food',      'Food & Drink',      'utensils',      1),
  ('retail',    'Retail',            'shopping-bag',  2),
  ('services',  'Services',          'briefcase',     3),
  ('health',    'Health & Wellness', 'heart',         4),
  ('nonprofit', 'Nonprofit',         'hand-heart',    5),
  ('other',     'Other',             'grid',          6)
ON CONFLICT (slug) DO NOTHING;

-- Drop any existing CHECK constraint on businesses.category so we can remap freely
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_category_check;

-- Remap any category values not present in the seed data to 'other'
UPDATE businesses
SET category = 'other'
WHERE category IS NOT NULL
  AND category NOT IN (SELECT slug FROM categories);

-- Add FK from businesses.category → categories.slug
ALTER TABLE businesses
  ADD CONSTRAINT businesses_category_fkey
  FOREIGN KEY (category) REFERENCES categories (slug);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "categories_public_select"
  ON categories
  FOR SELECT
  TO public
  USING (true);
