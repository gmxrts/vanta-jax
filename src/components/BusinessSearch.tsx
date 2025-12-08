import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
  }
}


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
};

const categories = [
  { value: '', label: 'All categories' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'health', label: 'Health' },
  { value: 'nonprofit', label: 'Nonprofit' },
];

export default function BusinessSearch() {
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // shared function to fetch businesses with filters
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
      query = query.or(`city.ilike.%${loc}%,zip.ilike.%${loc}%`);
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
      setError(error.message || 'Something went wrong fetching businesses.');
      setResults([]);
      return;
    }

    setResults((data || []) as Business[]);
  };

  // initial load: show all businesses
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setHasSearched(false);
      try {
        await fetchBusinesses();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      await fetchBusinesses({
        location,
        category,
        verifiedOnly,
      });

    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Search', {
        props: {
          location: location.trim() || 'empty',
          category: category || 'all',
          verifiedOnly,
        },
      });
    }
    } catch (err) {
      console.error(err);
      setError('Unexpected error occurred.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

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
              City or ZIP
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Jacksonville or 32202"
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
              className="
                w-full rounded-xl border border-purple-900/70
                bg-black/90
                px-3 py-2 text-sm text-slate-50
                outline-none focus:border-purple-400
                focus:ring-2 focus:ring-purple-500/70
                [color-scheme:dark]
              "
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

        {/* Verified-only toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            id="verifiedOnly"
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-3 w-3 rounded border-purple-800 bg-black text-purple-500 focus:ring-purple-500/80"
          />
          <label
            htmlFor="verifiedOnly"
            className="text-[11px] text-slate-300"
          >
            Show <span className="font-semibold text-purple-300">verified</span> businesses
            only
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_25px_rgba(147,51,234,0.8)] transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>

          <p className="text-[11px] text-slate-400">
            Tip: Try <span className="font-mono text-purple-300">Jacksonville</span> or a
            ZIP like <span className="font-mono text-purple-300">32202</span>.
          </p>
        </div>
      </form>

      {/* Status / errors */}
      {error && (
        <p className="rounded-xl border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      )}

      {!error && hasSearched && !loading && (
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span>
            {results.length === 0
              ? 'No businesses found. Try broadening your search.'
              : `Showing ${results.length} business${results.length === 1 ? '' : 'es'}.`}
          </span>
        </div>
      )}

      {/* Results grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((b) => (
          <article
            key={b.id}
            className="group flex h-full flex-col rounded-2xl border border-purple-900/60 bg-black/70 p-4 shadow-[0_0_30px_rgba(76,29,149,0.65)] transition hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.9)]"
          >
            <header className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  {b.name}
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  {b.category} • {b.city}, {b.state} {b.zip}
                </p>
              </div>
              {b.verified && (
                <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
                  Verified
                </span>
              )}
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
                  <a
                    href={b.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 underline underline-offset-2 decoration-purple-400/80 hover:text-purple-200"
                  >
                    Visit website
                  </a>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      {!hasSearched && results.length === 0 && !loading && (
        <p className="text-[11px] text-slate-400">
          Use the search above to discover Black-owned businesses in your area.
        </p>
      )}
    </div>
  );
}
