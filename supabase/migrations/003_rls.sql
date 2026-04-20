-- Add role column to profiles (required for admin policy checks below)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users read their own profile
CREATE POLICY "profiles: users select own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users update their own profile, but cannot self-promote to admin
CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role != 'admin');

-- Admins read all profiles
CREATE POLICY "profiles: admins select all"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- businesses
-- ============================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Public reads verified, non-archived listings
CREATE POLICY "businesses: public select verified"
  ON businesses FOR SELECT
  USING (
    verified = true
    AND (is_archived IS NULL OR is_archived = false)
  );

-- Admins read everything (unverified, archived, etc.)
CREATE POLICY "businesses: admins select all"
  ON businesses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Owners update their own listing (claimed_by is set on claim approval)
CREATE POLICY "businesses: owners update own"
  ON businesses FOR UPDATE
  USING (auth.uid() = claimed_by)
  WITH CHECK (auth.uid() = claimed_by);

-- Admins insert new businesses
CREATE POLICY "businesses: admins insert"
  ON businesses FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins delete businesses
CREATE POLICY "businesses: admins delete"
  ON businesses FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- business_claims
-- ============================================================
ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

-- Users submit claims for themselves only
CREATE POLICY "business_claims: users insert own"
  ON business_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners read their own claims
CREATE POLICY "business_claims: owners select own"
  ON business_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Admins read all claims
CREATE POLICY "business_claims: admins select all"
  ON business_claims FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins update claims (approve / reject)
CREATE POLICY "business_claims: admins update"
  ON business_claims FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- business_suggestions
-- ============================================================
ALTER TABLE business_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a suggestion (no auth required)
CREATE POLICY "business_suggestions: public insert"
  ON business_suggestions FOR INSERT
  WITH CHECK (true);

-- Admins read all suggestions
CREATE POLICY "business_suggestions: admins select all"
  ON business_suggestions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins update suggestions (promote / reject)
CREATE POLICY "business_suggestions: admins update"
  ON business_suggestions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- saves RLS policies will be added in the migration that creates the saves table (Phase 3)
