-- Fix: all admin policies that used EXISTS (SELECT 1 FROM profiles WHERE ...)
-- caused infinite recursion because querying `profiles` re-evaluates the same
-- policy. Replace with is_admin() which is SECURITY DEFINER and bypasses RLS.

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "profiles: admins select all" ON profiles;

CREATE POLICY "profiles: admins select all"
  ON profiles FOR SELECT
  USING (is_admin());

-- ============================================================
-- businesses
-- ============================================================
DROP POLICY IF EXISTS "businesses: admins select all" ON businesses;
DROP POLICY IF EXISTS "businesses: admins insert"     ON businesses;
DROP POLICY IF EXISTS "businesses: admins delete"     ON businesses;

CREATE POLICY "businesses: admins select all"
  ON businesses FOR SELECT
  USING (is_admin());

CREATE POLICY "businesses: admins insert"
  ON businesses FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "businesses: admins delete"
  ON businesses FOR DELETE
  USING (is_admin());

-- ============================================================
-- business_claims
-- ============================================================
DROP POLICY IF EXISTS "business_claims: admins select all" ON business_claims;
DROP POLICY IF EXISTS "business_claims: admins update"     ON business_claims;

CREATE POLICY "business_claims: admins select all"
  ON business_claims FOR SELECT
  USING (is_admin());

CREATE POLICY "business_claims: admins update"
  ON business_claims FOR UPDATE
  USING (is_admin());

-- ============================================================
-- business_suggestions
-- ============================================================
DROP POLICY IF EXISTS "business_suggestions: admins select all" ON business_suggestions;
DROP POLICY IF EXISTS "business_suggestions: admins update"     ON business_suggestions;

CREATE POLICY "business_suggestions: admins select all"
  ON business_suggestions FOR SELECT
  USING (is_admin());

CREATE POLICY "business_suggestions: admins update"
  ON business_suggestions FOR UPDATE
  USING (is_admin());
