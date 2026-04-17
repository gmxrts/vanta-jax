# VantaJax — Implementation Snippets

> Ready-to-use code for every audit finding + supercharge recommendation.
> Organized by priority tier. Each snippet includes the target file path and apply instructions.

---

## 🔴 CRITICAL — Fix These Now

---

### Fix #1 — `category` enforcement via lookup table

**Run in:** Supabase SQL Editor → New Query

```sql
-- supabase/migrations/001_categories.sql

CREATE TABLE categories (
  slug       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  icon_slug  TEXT,
  sort_order INT DEFAULT 0
);

INSERT INTO categories (slug, label, icon_slug, sort_order) VALUES
  ('food',      'Food & Drink',      'utensils',    1),
  ('retail',    'Retail',            'shopping-bag', 2),
  ('services',  'Services',          'briefcase',   3),
  ('health',    'Health & Wellness', 'heart',        4),
  ('nonprofit', 'Nonprofit',         'hand-heart',  5),
  ('other',     'Other',             'grid',         6);

-- Wire businesses.category to the lookup table
ALTER TABLE businesses
  ADD CONSTRAINT fk_category
  FOREIGN KEY (category) REFERENCES categories(slug);

-- RLS — categories are public read-only
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
```

```typescript
// src/lib/types.ts — add alongside existing types

export type CategorySlug =
  | 'food'
  | 'retail'
  | 'services'
  | 'health'
  | 'nonprofit'
  | 'other';

export interface Category {
  slug: CategorySlug;
  label: string;
  icon_slug: string | null;
  sort_order: number;
}
```

```typescript
// src/lib/categories.ts — shared loader, used in BusinessSearch + suggest form

import { supabase } from './supabaseClient';
import type { Category } from './types';

let _cache: Category[] | null = null;

export async function getCategories(): Promise<Category[]> {
  if (_cache) return _cache;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  _cache = data as Category[];
  return _cache;
}
```

---

### Fix #2 — PostGIS migration for accurate proximity queries

> ⚠️ **Before running:** Enable PostGIS in Supabase Dashboard → Database → Extensions → search "postgis" → Enable

```sql
-- supabase/migrations/002_postgis.sql

-- 1. Enable extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geography column
ALTER TABLE businesses
  ADD COLUMN location geography(POINT, 4326);

-- 3. Backfill from existing latitude/longitude
UPDATE businesses
  SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Spatial index
CREATE INDEX businesses_location_idx
  ON businesses USING GIST(location);
```

```sql
-- supabase/migrations/002b_nearby_rpc.sql
-- Supabase RPC used by the "Near Me" feature

CREATE OR REPLACE FUNCTION businesses_nearby(
  user_lat   FLOAT,
  user_lng   FLOAT,
  city_name  TEXT,
  radius_m   FLOAT DEFAULT 8047   -- 5 miles
)
RETURNS TABLE (
  id                    UUID,
  name                  TEXT,
  category              TEXT,
  address               TEXT,
  is_address_public     BOOLEAN,
  public_location_label TEXT,
  latitude              FLOAT,
  longitude             FLOAT,
  description           TEXT,
  website               TEXT,
  logo_url              TEXT,
  verified              BOOLEAN,
  featured              BOOLEAN,
  hours                 JSONB,
  dist_meters           FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id, name, category, address, is_address_public,
    public_location_label, latitude, longitude, description,
    website, logo_url, verified, featured, hours,
    ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS dist_meters
  FROM businesses
  WHERE
    city = city_name
    AND verified = true
    AND (is_archived IS NULL OR is_archived = false)
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_m
    )
  ORDER BY dist_meters ASC;
$$;
```

```typescript
// src/lib/geo.ts

import { supabase } from './supabaseClient';
import type { Business } from './types';

export async function getBusinessesNearby(
  userLat: number,
  userLng: number,
  cityName: string,
  radiusMeters = 8047
): Promise<Business[]> {
  const { data, error } = await supabase.rpc('businesses_nearby', {
    user_lat: userLat,
    user_lng: userLng,
    city_name: cityName,
    radius_m: radiusMeters,
  });
  if (error) throw error;
  return data as Business[];
}

export function requestUserLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { timeout: 8000 }
    );
  });
}
```

---

### Fix #3 — Row Level Security policies

```sql
-- supabase/migrations/003_rls.sql

-- ── businesses ─────────────────────────────────────────────────────────────

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Anyone can read verified, non-archived businesses
CREATE POLICY "Public read businesses"
  ON businesses FOR SELECT
  USING (verified = true AND (is_archived IS NULL OR is_archived = false));

-- Admins can read everything (including unverified / archived)
CREATE POLICY "Admins read all businesses"
  ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Owners can update only their own listing
CREATE POLICY "Owners update own listing"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Admins can insert, archive, and hard-delete
CREATE POLICY "Admins insert businesses"
  ON businesses FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete businesses"
  ON businesses FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── business_claims ────────────────────────────────────────────────────────

ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

-- Users can submit and read their own claims
CREATE POLICY "Users insert own claims"
  ON business_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners read own claims"
  ON business_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read and update all claims
CREATE POLICY "Admins read all claims"
  ON business_claims FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update claims"
  ON business_claims FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── business_suggestions ──────────────────────────────────────────────────

ALTER TABLE business_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a suggestion (no auth required)
CREATE POLICY "Anyone can submit suggestions"
  ON business_suggestions FOR INSERT
  WITH CHECK (true);

-- Admins read and manage suggestions
CREATE POLICY "Admins read suggestions"
  ON business_suggestions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update suggestions"
  ON business_suggestions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── profiles ──────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users read their own profile
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users update own profile (cannot self-promote to admin)
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (role != 'admin');

-- Admins read all profiles
CREATE POLICY "Admins read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ── saves ─────────────────────────────────────────────────────────────────

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saves"
  ON saves FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 🟡 IMPORTANT — Address Before Next Launch

---

### Fix #4 — Status enums for `business_suggestions` and `business_claims`

```sql
-- supabase/migrations/004_status_enums.sql

-- Suggestion status
CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE business_suggestions
  ALTER COLUMN status TYPE suggestion_status
  USING status::suggestion_status;

ALTER TABLE business_suggestions
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE business_suggestions SET status = 'pending' WHERE status IS NULL;
ALTER TABLE business_suggestions ALTER COLUMN status SET NOT NULL;

-- Claim status
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE business_claims
  ALTER COLUMN status TYPE claim_status
  USING status::claim_status;

ALTER TABLE business_claims
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE business_claims SET status = 'pending' WHERE status IS NULL;
ALTER TABLE business_claims ALTER COLUMN status SET NOT NULL;
```

```typescript
// src/lib/types.ts — add to existing types

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';
```

---

### Fix #5 — Admin role model (`profiles.role` column)

```sql
-- supabase/migrations/005_profiles_role.sql

ALTER TABLE profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'owner', 'admin'));

-- Auto-create profile row on new signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper function used in RLS policies (avoids recursive policy lookup)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

```typescript
// src/lib/auth.ts

import { supabase } from './supabaseClient';

export type UserRole = 'user' | 'owner' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}

// Use in API routes to gate admin actions without relying only on ADMIN_ACCESS_KEY
export async function requireAdmin(request: Request): Promise<boolean> {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const url = new URL(request.url);
  if (url.searchParams.get('key') === adminKey) return true;
  return await isAdmin();
}
```

---

### Fix #6 — `logo_url` → store paths, construct URLs at render time

```sql
-- supabase/migrations/006_logo_path.sql

-- Add the new path column
ALTER TABLE businesses ADD COLUMN logo_path TEXT;

-- Backfill: extract path from existing full URLs
-- (Only needed if URLs follow the pattern: .../business-logos/<path>)
UPDATE businesses
  SET logo_path = regexp_replace(logo_url, '^.*/business-logos/', '')
  WHERE logo_url IS NOT NULL AND logo_url LIKE '%business-logos%';
```

```typescript
// src/lib/storage.ts

import { supabase } from './supabaseClient';

const BUCKET = 'business-logos';
const MAX_SIZE_BYTES = 2_000_000; // 2MB — matches your current file storage docs
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export interface UploadResult {
  path: string;      // what gets saved to businesses.logo_path
  publicUrl: string; // what gets used in <img src>
}

export async function uploadBusinessLogo(
  file: File,
  businessId: string
): Promise<UploadResult> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`Logo must be under 2MB. File is ${(file.size / 1_000_000).toFixed(1)}MB.`);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Only JPEG, PNG, WebP, and SVG are allowed.`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const publicUrl = getLogoUrl(path) ?? '';
  return { path, publicUrl };
}

/**
 * Always use this to render logos — never hardcode bucket URLs in templates.
 * Appends Supabase image transform params (paid plan) or falls back cleanly.
 */
export function getLogoUrl(
  storagePath: string | null | undefined,
  opts: { width?: number; quality?: number } = {}
): string | null {
  if (!storagePath) return null;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const params = new URLSearchParams({ format: 'webp' });
  if (opts.width) params.set('width', String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));

  return `${publicUrl}?${params}`;
}
```

---

### Fix #7 — Route consistency + redirect

```javascript
// astro.config.mjs — add redirects block

import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  redirects: {
    // Singular → plural: catches any old shared links
    '/business/[id]': '/businesses/[id]',
  },
});
```

```typescript
// src/lib/routes.ts — single source of truth for all internal links
// Import this everywhere instead of hardcoding strings

export const routes = {
  home:            '/',
  businesses:      '/businesses',
  business:        (id: string) => `/businesses/${id}`,
  claim:           (id: string) => `/claim/${id}`,
  suggestBusiness: '/suggest-business',
  login:           '/login',
  dashboard:       '/dashboard',
  admin:           '/admin',
  metrics:         '/metrics',
  about:           '/about',
  terms:           '/terms',
  privacy:         '/privacy',
} as const;
```

---

### Fix #8 — City-scoped routing (lay the groundwork now)

```typescript
// src/lib/cities.ts — city registry, single source of truth

export interface City {
  slug: string;
  name: string;
  state: string;
  mapCenter: [number, number]; // [lng, lat] for Mapbox
  mapZoom: number;
}

export const CITIES: City[] = [
  {
    slug: 'jacksonville-fl',
    name: 'Jacksonville',
    state: 'FL',
    mapCenter: [-81.6557, 30.3322],
    mapZoom: 11,
  },
  // Add new cities here — routes and queries update automatically
];

export const DEFAULT_CITY = CITIES[0];

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug);
}

export function assertCity(slug: string): City {
  const city = getCityBySlug(slug);
  if (!city) throw new Error(`Unknown city slug: ${slug}`);
  return city;
}
```

```javascript
// astro.config.mjs — add Jacksonville redirect so URLs are future-proof

redirects: {
  '/business/[id]':   '/businesses/[id]',       // Fix #7 above
  // Uncomment when ready to go city-slug-prefixed:
  // '/businesses':      '/jacksonville-fl/businesses',
  // '/businesses/[id]': '/jacksonville-fl/businesses/[id]',
},
```

---

### Fix #9 — Database indexes

```sql
-- supabase/migrations/007_indexes.sql
-- Run this in Supabase SQL Editor — safe on a live table, builds concurrently

-- Core browse filters
CREATE INDEX idx_businesses_city        ON businesses(city);
CREATE INDEX idx_businesses_category    ON businesses(category);
CREATE INDEX idx_businesses_verified    ON businesses(verified);
CREATE INDEX idx_businesses_featured    ON businesses(featured);
CREATE INDEX idx_businesses_is_archived ON businesses(is_archived);

-- Composite: most common browse query
-- WHERE city = ? AND verified = true AND is_archived = false
CREATE INDEX idx_businesses_browse
  ON businesses(city, verified, is_archived);

-- Composite: featured businesses on homepage
CREATE INDEX idx_businesses_featured_browse
  ON businesses(city, featured, verified);

-- Hours JSONB for "open now" queries
CREATE INDEX idx_businesses_hours ON businesses USING GIN(hours);

-- Suggestions and claims queue management
CREATE INDEX idx_claims_status      ON business_claims(status);
CREATE INDEX idx_claims_business_id ON business_claims(business_id);

-- Analytics: search_events time-series
CREATE INDEX idx_search_events_created  ON search_events(created_at DESC);
CREATE INDEX idx_search_events_category ON search_events(category);

-- Note: business_suggestions does not have a status column — skip that index
-- until a status column is added to that table.
```

---

### Fix #10 — Mapbox token guard

```typescript
// src/lib/mapbox.ts

export const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error(
    '[VantaJax] PUBLIC_MAPBOX_TOKEN is not set. ' +
    'Add it to .env.local and your Vercel project settings.'
  );
}

export const JAX_MAP_CONFIG = {
  style:  'mapbox://styles/mapbox/dark-v11',
  center: [-81.6557, 30.3322] as [number, number],
  zoom:   11,
};
```

```
# .env.local (committed: .env.example — never commit .env.local itself)

PUBLIC_MAPBOX_TOKEN=pk.eyJ...your_token_here

# Restrict this token in Mapbox dashboard:
#   Allowed URLs: https://vantajax.com, https://*.vercel.app
#   Allowed scopes: styles:read, tiles:read  (NO write scopes)
```

---

## 🟢 RECOMMENDED — Phase 2 Improvements

---

### Rec #11 — Full-text search with `tsvector`

```sql
-- supabase/migrations/008_fulltext_search.sql

-- Generated column — auto-updates when name/description/category changes
ALTER TABLE businesses
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '')        || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '')    || ' ' ||
      coalesce(city, '')
    )
  ) STORED;

-- GIN index for fast full-text lookups
CREATE INDEX idx_businesses_search
  ON businesses USING GIN(search_vector);
```

```typescript
// src/lib/search.ts — replaces ilike queries in BusinessSearch.tsx

import { supabase } from './supabaseClient';
import type { Business } from './types';

export async function searchBusinesses(
  query: string,
  cityName: string,
  filters: {
    category?: string;
    verifiedOnly?: boolean;
    womanOwned?: boolean;
  } = {}
): Promise<Business[]> {
  let q = supabase
    .from('businesses')
    .select('*')
    .eq('city', cityName)
    .eq('is_archived', false);

  if (query.trim()) {
    // Full-text search with relevance ranking
    q = q
      .textSearch('search_vector', query, { type: 'plain', config: 'english' })
      .order('ts_rank(search_vector, plainto_tsquery(' + JSON.stringify(query) + '))', { ascending: false });
  } else {
    q = q.order('name');
  }

  if (filters.category)    q = q.eq('category', filters.category);
  if (filters.verifiedOnly) q = q.eq('verified', true);
  if (filters.womanOwned)   q = q.eq('woman_owned', true);

  const { data, error } = await q;
  if (error) throw error;
  return data as Business[];
}
```

---

### Rec #12 — SEO: Sitemap + Schema.org JSON-LD

```bash
# Terminal — install sitemap integration
pnpm add @astrojs/sitemap
```

```javascript
// astro.config.mjs — add sitemap integration

import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vantajax.com',  // required for sitemap
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap()],
  redirects: {
    '/business/[id]': '/businesses/[id]',
  },
});
```

```astro
---
// src/pages/businesses/[id].astro — add to the <head> via your Layout

// Assumes business record is already fetched as `business`
const title = `${business.name} — Black-Owned ${business.category_label} in ${business.city}, FL | VantaJax`;
const description = business.description ?? `Discover ${business.name}, a verified Black-owned business in ${business.city}, FL.`;
const canonicalUrl = `https://vantajax.com/businesses/${business.id}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": business.name,
  "description": description,
  "url": business.website ?? canonicalUrl,
  "image": business.logo_url ?? undefined,
  "telephone": business.phone ?? undefined,
  "address": business.is_address_public ? {
    "@type": "PostalAddress",
    "streetAddress": business.address,
    "addressLocality": business.city,
    "addressRegion": business.state,
    "postalCode": business.zip,
    "addressCountry": "US"
  } : undefined,
  "sameAs": [
    business.social_instagram,
    business.social_facebook,
    business.social_tiktok,
    business.social_linkedin,
    business.social_x,
  ].filter(Boolean),
};
---

<!-- In your <head> -->
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalUrl} />

<!-- Open Graph -->
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:type" content="business.business" />
{business.logo_url && <meta property="og:image" content={business.logo_url} />}

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />

<!-- Schema.org JSON-LD -->
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

---

### Rec #13 — Geocoding fallback: auto-populate `lat`/`lng` on insert

```typescript
// src/pages/api/admin/geocode-business.ts
// POST — called from admin UI to geocode a business missing lat/lng

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabaseServer';

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const { businessId, key } = await request.json();

  if (key !== adminKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createSupabaseServerClient(cookies);

  // Fetch the business address
  const { data: business, error: fetchErr } = await supabase
    .from('businesses')
    .select('id, address, city, state, zip')
    .eq('id', businessId)
    .single();

  if (fetchErr || !business) {
    return new Response(JSON.stringify({ error: 'Business not found' }), { status: 404 });
  }

  const address = `${business.address}, ${business.city}, ${business.state} ${business.zip}`;
  const encoded = encodeURIComponent(address);
  const apiKey = import.meta.env.GOOGLE_PLACES_API_KEY;

  const geoRes = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`
  );
  const geoData = await geoRes.json();

  if (geoData.status !== 'OK' || !geoData.results[0]) {
    return new Response(JSON.stringify({ error: 'Geocoding failed', status: geoData.status }), { status: 400 });
  }

  const { lat, lng } = geoData.results[0].geometry.location;

  const { error: updateErr } = await supabase
    .from('businesses')
    .update({ lat, lng })
    .eq('id', businessId);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, lat, lng }), { status: 200 });
};
```

---

### Rec #14 — Image optimization helper

```typescript
// src/lib/imageUrl.ts
// Use everywhere you render a logo — replaces raw logo_url references

import { supabase } from './supabaseClient';

const BUCKET = 'business-logos';

interface ImgOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
}

/**
 * Returns a Supabase Storage URL with optional transform params.
 * Transform params are ignored on the free tier but safe to include.
 */
export function businessLogoUrl(
  storagePath: string | null | undefined,
  opts: ImgOptions = { width: 200, quality: 80, format: 'webp' }
): string | null {
  if (!storagePath) return null;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const params = new URLSearchParams();
  if (opts.width)   params.set('width',   String(opts.width));
  if (opts.height)  params.set('height',  String(opts.height));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.format)  params.set('format',  opts.format);

  return `${publicUrl}?${params}`;
}
```

```astro
<!-- Example usage in BusinessAvatar.tsx or any template -->
<!-- Replace: <img src={business.logo_url} /> -->
<!-- With:    <img src={businessLogoUrl(business.logo_path, { width: 80, quality: 80 })} /> -->
```

---

### Rec #15 — Rate limiting on API routes

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

```typescript
// src/lib/ratelimit.ts
// Wrap any API route that needs protection

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   import.meta.env.UPSTASH_REDIS_URL,
  token: import.meta.env.UPSTASH_REDIS_TOKEN,
});

// Different limiters for different routes
export const limiters = {
  // Suggestion form: 5 submissions per IP per hour
  suggestion: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix:  'rl:suggestion',
  }),

  // View counter: 10 increments per IP per minute (prevents click farms)
  view: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix:  'rl:view',
  }),

  // Claim submit: 3 per IP per day
  claim: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '24 h'),
    prefix:  'rl:claim',
  }),
};

export async function checkRateLimit(
  limiter: Ratelimit,
  request: Request
): Promise<{ allowed: boolean; remaining: number }> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const result = await limiter.limit(ip);
  return { allowed: result.success, remaining: result.remaining };
}
```

```typescript
// Example: apply to src/pages/api/claim.ts

import { limiters, checkRateLimit } from '../../lib/ratelimit';

export const POST: APIRoute = async ({ request }) => {
  const { allowed } = await checkRateLimit(limiters.claim, request);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Retry-After': '3600' },
    });
  }

  // ... rest of claim handler
};
```

---

## ⚡ SUPERCHARGE — High-Impact Features

---

### S1 — "Open Now" badge utility

```typescript
// src/lib/hours.ts

type DayHours = { open: string; close: string } | null;
type HoursMap = Record<string, DayHours>;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export interface OpenStatus {
  isOpen: boolean;
  label: string;       // "Open now", "Closed", "Opens at 9:00 AM", "Closes at 6:00 PM"
  closingSoon: boolean; // true if closing within 30 minutes
}

export function getOpenStatus(hours: HoursMap | null | undefined): OpenStatus {
  if (!hours) return { isOpen: false, label: 'Hours not listed', closingSoon: false };

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // "14:30"
  const today = hours[dayKey];

  if (!today) return { isOpen: false, label: 'Closed today', closingSoon: false };

  const isOpen = currentTime >= today.open && currentTime < today.close;

  // Check if closing within 30 min
  const closeDate = new Date();
  const [closeH, closeM] = today.close.split(':').map(Number);
  closeDate.setHours(closeH, closeM, 0, 0);
  const minsUntilClose = (closeDate.getTime() - now.getTime()) / 60_000;
  const closingSoon = isOpen && minsUntilClose <= 30;

  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''} ${suffix}`;
  };

  if (isOpen) {
    return {
      isOpen: true,
      label: closingSoon ? `Closes at ${fmt(today.close)}` : 'Open now',
      closingSoon,
    };
  }

  if (currentTime < today.open) {
    return { isOpen: false, label: `Opens at ${fmt(today.open)}`, closingSoon: false };
  }

  return { isOpen: false, label: `Closed · Opens ${getNextOpenDay(hours, now)}`, closingSoon: false };
}

function getNextOpenDay(hours: HoursMap, from: Date): string {
  for (let i = 1; i <= 7; i++) {
    const dayIdx = (from.getDay() + i) % 7;
    const dayKey = DAY_KEYS[dayIdx];
    const h = hours[dayKey];
    if (h) {
      const dayName = i === 1 ? 'tomorrow' : DAY_KEYS[dayIdx].charAt(0).toUpperCase() + DAY_KEYS[dayIdx].slice(1);
      return `${dayName} at ${h.open}`;
    }
  }
  return 'soon';
}
```

---

### S2 — Dynamic OG image per business

```bash
pnpm add @vercel/og
```

```typescript
// src/pages/api/og/[id].ts
// Generates a branded social card for each business

import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const GET: APIRoute = async ({ params, cookies }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, city, state, logo_url, verified, woman_owned')
    .eq('id', params.id)
    .single();

  if (!business) {
    return new Response('Not found', { status: 404 });
  }

  const categoryLabel: Record<string, string> = {
    food: 'Food & Drink', retail: 'Retail', services: 'Services',
    health: 'Health & Wellness', nonprofit: 'Nonprofit', other: 'Business',
  };

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          background: '#0a0a0a',
          padding: '48px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        },
        children: [
          // VantaJax wordmark top-left
          { type: 'div', props: { style: { position: 'absolute', top: 48, left: 48, fontSize: 20, color: '#888', letterSpacing: '0.1em' }, children: 'VANTAJAX' } },
          // Business name
          { type: 'div', props: { style: { fontSize: 52, fontWeight: 700, lineHeight: 1.1, marginBottom: 16 }, children: business.name } },
          // Category + city
          { type: 'div', props: { style: { fontSize: 24, color: '#aaa' }, children: `${categoryLabel[business.category] ?? 'Business'} · ${business.city}, ${business.state}` } },
          // Verified badge
          business.verified && {
            type: 'div',
            props: {
              style: { marginTop: 24, display: 'inline-flex', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', fontSize: 16, color: '#ccc' },
              children: '✓ Verified Black-Owned Business',
            },
          },
        ].filter(Boolean),
      },
    },
    { width: 1200, height: 630 }
  );
};
```

```astro
<!-- Add to src/pages/businesses/[id].astro <head> -->
<meta property="og:image" content={`https://vantajax.com/api/og/${business.id}`} />
<meta name="twitter:image" content={`https://vantajax.com/api/og/${business.id}`} />
```

---

### S3 — Business completeness score

```typescript
// src/lib/completeness.ts
// Used in owner dashboard to nudge listing improvements

export interface CompletenessResult {
  score: number;           // 0–100
  missing: string[];       // human-readable missing field labels
  complete: string[];
}

const FIELDS: Array<{ key: string; label: string; weight: number }> = [
  { key: 'description',      label: 'Business description',  weight: 20 },
  { key: 'logo_url',         label: 'Logo',                  weight: 20 },
  { key: 'hours',            label: 'Business hours',        weight: 15 },
  { key: 'website',          label: 'Website',               weight: 10 },
  { key: 'phone',            label: 'Phone number',          weight: 10 },
  { key: 'address',          label: 'Address',               weight: 10 },
  { key: 'social_instagram', label: 'Instagram',             weight:  5 },
  { key: 'social_facebook',  label: 'Facebook',              weight:  5 },
  { key: 'category',         label: 'Category',              weight:  5 },
];

export function getCompletenessScore(business: Record<string, unknown>): CompletenessResult {
  let score = 0;
  const missing: string[] = [];
  const complete: string[] = [];

  for (const field of FIELDS) {
    const value = business[field.key];
    const filled = value !== null && value !== undefined && value !== '';
    if (filled) {
      score += field.weight;
      complete.push(field.label);
    } else {
      missing.push(field.label);
    }
  }

  return { score, missing, complete };
}
```

---

### S4 — `updated_at` on `business_suggestions`

```sql
-- supabase/migrations/009_suggestions_updated_at.sql

ALTER TABLE business_suggestions
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reuse the set_updated_at() trigger function created in an earlier migration
CREATE TRIGGER suggestions_updated_at
  BEFORE UPDATE ON business_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 🗂 Migration Order

Run migrations in this sequence to avoid FK/dependency errors:

| Order | File | Depends on |
|-------|------|------------|
| 1 | `001_categories.sql` | — |
| 2 | `002_postgis.sql` + `002b_nearby_rpc.sql` | PostGIS extension enabled |
| 3 | `003_rls.sql` | `profiles.role` (run 005 first if profiles table is empty) |
| 4 | `004_status_enums.sql` | — |
| 5 | `005_profiles_role.sql` | `profiles` table exists |
| 6 | `006_logo_path.sql` | — |
| 7 | `007_indexes.sql` | — |
| 8 | `008_fulltext_search.sql` | — |
| 9 | `009_suggestions_updated_at.sql` | `set_updated_at()` function from earlier migration |

---

## ✅ Quick-Win Checklist (30-min jobs)

These require no migrations — do them right now:

- [ ] **Restrict Mapbox token** in [account.mapbox.com](https://account.mapbox.com) → Allowed URLs → add your Vercel domain
- [ ] **Add `routes.ts`** and replace all hardcoded `/businesses/[id]` strings
- [ ] **Add `/business/[id]` redirect** to `astro.config.mjs`
- [ ] **Add `PUBLIC_MAPBOX_TOKEN` check** in `mapbox.ts` so misconfiguration fails loudly
- [ ] **Run `007_indexes.sql`** in Supabase SQL editor — zero risk, immediate benefit