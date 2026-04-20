-- Migration 012: Expand categories from 6 to 12
-- Adds 8 new categories, updates labels/sort_orders, remaps 'services' → 'professional'

-- ── 1. Insert new categories ────────────────────────────────────────────────
INSERT INTO categories (slug, label, icon_slug, sort_order) VALUES
  ('beauty',       'Beauty & Personal Care', 'scissors',   2),
  ('professional', 'Professional Services',  'briefcase',  5),
  ('creative',     'Creative Arts',           'palette',    6),
  ('home',         'Home Services',           'hammer',     7),
  ('education',    'Education & Coaching',   'book-open',  8),
  ('events',       'Events & Entertainment', 'calendar',   9),
  ('finance',      'Finance & Insurance',    'banknote',  10),
  ('technology',   'Technology',             'cpu',       11)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Update labels and sort_orders for existing categories ─────────────────
UPDATE categories SET label = 'Food & Drink',          sort_order = 1  WHERE slug = 'food';
UPDATE categories SET label = 'Health & Wellness',     sort_order = 3  WHERE slug = 'health';
UPDATE categories SET label = 'Retail & Shopping',     sort_order = 4  WHERE slug = 'retail';
UPDATE categories SET label = 'Nonprofit & Community', sort_order = 12 WHERE slug = 'nonprofit';
UPDATE categories SET label = 'Other',                 sort_order = 13 WHERE slug = 'other';

-- ── 3. Remap existing businesses away from 'services' ───────────────────────
-- 'services' was the generic catch-all; 'professional' is the closest equivalent
UPDATE businesses SET category = 'professional' WHERE category = 'services';

-- ── 4. Remove the now-empty 'services' slug ──────────────────────────────────
DELETE FROM categories WHERE slug = 'services';
