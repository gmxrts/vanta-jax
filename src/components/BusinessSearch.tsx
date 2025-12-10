import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

type Business = {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  verified: boolean;
  featured?: boolean | null;
  area?: string | null;
};

const categories = [
  { value: '', label: 'All categories' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'health', label: 'Health' },
  { value: 'nonprofit', label: 'Nonprofit' },
];

type QuickFilter = {
  id: string;
  label: string;
  category?: string;
  location?: string;
  verifiedOnly?: boolean;
};

const quickFilters: QuickFilter[] = [
  { id: 'all', label: 'All', category: '' },
  { id: 'food', label: 'Food & Dining', category: 'food' },
  { id: 'retail', label: 'Retail', category: 'retail' },
  { id: 'services', label: 'Services', category: 'services' },
  { id: 'health', label: 'Health', category: 'health' },
  { id: 'nonprofit', label: 'Nonprofit', category: 'nonprofit' },
  { id: 'verified', label: 'Verified only', verifiedOnly: true },
];

export default function BusinessSearch() {
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [featured, setFeatured] = useState<Business[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Load featured businesses once on mount
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        setLoadingFeatured(true);
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('featured', true)
          .order('verified', { ascending: false })
          .order('name', { ascending: true });

        if (error) {
          console.error(error);
          return;
        }

        setFeatured((data || []) as Business[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFeatured(false);
      }
    };

    loadFeatured();
  }, []);

  const fetchBusinesses = async (opts?: {
    location?: string;
    category?: string;
    verifiedOnly?: boolean;
  }) => {
    const loc = (opts?.location || '').trim();
    const cat = opts?.category || '';
    const verified = opts?.verifiedOnly || false;

    let query = supabase.from('businesses').select('*');

    if (loc) {
      const pattern = `%${loc}%`;
      // name OR city OR zip
      query = query.or(
        `city.ilike.${pattern},zip.ilike.${pattern},name.ilike.${pattern}`
      );
    }

    if (cat) {
      query = query.eq('category', cat);
    }

    if (verified) {
      query = query.eq('verified', true);
    }

    const { data, error } = await query
      .order('verified', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      throw error;
    }

    const results = (data || []) as Business[];

    // 🔎 Fire-and-forget logging into search_events
    supabase
      .from('search_events')
      .insert({
        location: loc || null,
        category: cat || null,
        verified_only: verified,
        result_count: results.length,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error('Error logging search event:', logError);
        }
      });

    return results;
  };

  const applyQuickFilter = async (filter: QuickFilter) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setActiveQuickFilter(filter.id);

    const nextLocation = filter.location ?? '';
    const nextCategory = filter.category ?? '';
    const nextVerified = filter.verifiedOnly ?? false;

    // keep form inputs in sync with the pill selection
    setLocation(nextLocation);
    setCategory(nextCategory);
    setVerifiedOnly(nextVerified);

    try {
      const data = await fetchBusinesses({
        location: nextLocation,
        category: nextCategory,
        verifiedOnly: nextVerified,
      });
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unexpected error occurred.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setLocation('');
    setCategory('');
    setVerifiedOnly(false);
    setResults([]);
    setHasSearched(false);
    setError(null);
    setActiveQuickFilter(null);
  };

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setActiveQuickFilter(null); // manual search clears pill selection

    try {
      const data = await fetchBusinesses({
        location,
        category,
        verifiedOnly,
      });
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unexpected error occurred.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderBusinessCard = (b: Business) => (
    <a
      key={b.id}
      href={`/business/${b.id}`}
      className="block no-underline"
    >
      <article className="group flex h-full flex-col rounded-2xl border border-purple-900/60 bg-black/70 p-4 shadow-[0_0_30px_rgba(76,29,149,0.65)] transition hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.9)]">
        <header className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">{b.name}</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              {b.category} •{' '}
              {b.area ? (
                <>
                  {b.area} • {b.city}, {b.state} {b.zip}
                </>
              ) : (
                <>
                  {b.city}, {b.state} {b.zip}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {b.verified && (
              <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
                Verified
              </span>
            )}
            {b.featured && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                Featured
              </span>
            )}
          </div>
        </header>

        <p className="text-xs text-slate-200">{b.address}</p>

        {b.description && (
          <p className="mt-2 line-clamp-3 text-xs text-slate-300">
            {b.description}
          </p>
        )}

        <div className="mt-3 space-y-1 text-xs text-slate-200">
          {b.phone && <p>📞 {b.phone}</p>}
          {b.website && (
            <p>
              🌐{' '}
              <span className="text-purple-300 underline underline-offset-2 decoration-purple-400/80 group-hover:text-purple-200">
                Visit website
              </span>
            </p>
          )}
        </div>
      </article>
    </a>
  );

  return (
    <div className="space-y-6">
      {/* Search card */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-purple-900/80 bg-black/70 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_0_35px_rgba(76,29,149,0.6)]"
      >
        <div className="grid gap-4 sm:grid-cols-[2fr,1.5fr] sm:items-end">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Name, City, or ZIP
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Soul, Jacksonville, or 32205"
              className="w-full rounded-xl border border-purple-900/70 bg-black/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70 [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-purple-900/70 bg-black/90 px-3 py-2 text-sm text-slate-50 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70 [color-scheme:dark]"
            >
              {categories.map((c) => (
                <option
                  key={c.value || 'all'}
                  value={c.value}
                  className="bg-black text-slate-50"
                >
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-3 w-3 rounded border-purple-800 bg-black text-purple-500 focus:ring-purple-500/80"
            />
            <span>Show verified only</span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_25px_rgba(147,51,234,0.8)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>

            <p className="text-[11px] text-slate-400">
              Tip: Try a name like{' '}
              <span className="font-mono text-purple-300">Soul</span> or a ZIP
              like <span className="font-mono text-purple-300">32205</span>.
            </p>
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFilters.map((filter) => {
            const isActive = activeQuickFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                disabled={loading}
                onClick={() => applyQuickFilter(filter)}
                className={[
                  'rounded-full border px-3 py-1 text-[11px] transition',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  isActive
                    ? 'border-purple-400 bg-purple-600/30 text-purple-50 shadow-[0_0_15px_rgba(147,51,234,0.7)]'
                    : 'border-purple-900/70 bg-black/60 text-slate-300 hover:border-purple-400 hover:text-slate-100',
                ].join(' ')}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </form>

      {/* Status / errors */}
      {error && (
        <p className="rounded-xl border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      )}

      {!error && hasSearched && !loading && (
        <div className="space-y-3 text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <span>
              {results.length === 0
                ? 'No businesses found for this search.'
                : `Showing ${results.length} business${
                    results.length === 1 ? '' : 'es'
                  }.`}
            </span>

            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[11px] text-purple-300 hover:text-purple-200 underline underline-offset-2"
            >
              Clear search
            </button>
          </div>

          {results.length === 0 && (
            <div className="rounded-2xl border border-purple-900/70 bg-black/70 px-3 py-3">
              <p className="text-[11px] text-slate-200">Try one of these:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-400">
                <li>Search by just the city or ZIP.</li>
                <li>
                  Use fewer words (e.g.{' '}
                  <span className="font-mono text-purple-300">Soul</span>{' '}
                  instead of full name).
                </li>
                <li>
                  Switch to a broader category like{' '}
                  <span className="font-mono text-purple-300">Services</span>.
                </li>
              </ul>

              {/* Update /suggest if your suggestion form lives elsewhere */}
              <a
                href="/suggest"
                className="mt-2 inline-flex items-center rounded-lg bg-purple-600/80 px-3 py-1.5 text-[11px] font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.8)] hover:bg-purple-500"
              >
                Can’t find a spot? Suggest a business.
              </a>
            </div>
          )}
        </div>
      )}

      {/* Featured section (before any search) */}
      {!hasSearched && !loadingFeatured && featured.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Start here • Featured in Jacksonville
            </h2>
            <span className="text-[10px] text-slate-500">
              Curated set of Black-owned spots to check out first.
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((b) => renderBusinessCard(b))}
          </div>
        </section>
      )}

      {/* Search results grid */}
      {hasSearched && (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((b) => renderBusinessCard(b))}
        </div>
      )}

      {!hasSearched && results.length === 0 && featured.length === 0 && (
        <p className="text-[11px] text-slate-400">
          Use the search above to discover Black-owned businesses in your area.
        </p>
      )}
    </div>
  );
}
