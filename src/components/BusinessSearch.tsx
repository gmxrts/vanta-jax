import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

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

type QuickFilter = {
  id: string;
  label: string;
  category?: string;
  location?: string;
  verifiedOnly?: boolean;
};

const quickFilters: QuickFilter[] = [
  { id: "all", label: "All", category: "" },
  { id: "food", label: "Food & Dining", category: "food" },
  { id: "retail", label: "Retail", category: "retail" },
  { id: "services", label: "Services", category: "services" },
  { id: "health", label: "Health & Wellness", category: "health" },
  { id: "nonprofit", label: "Nonprofit & Community", category: "nonprofit" },
  { id: "verified", label: "Verified only", verifiedOnly: true },
];

const categories = [
  { value: "", label: "All categories" },
  { value: "food", label: "Food & Dining" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health & Wellness" },
  { value: "nonprofit", label: "Nonprofit & Community" },
  { value: "other", label: "Other" },
];

export default function BusinessSearch() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [featured, setFeatured] = useState<Business[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        setLoadingFeatured(true);
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("featured", true)
          .order("verified", { ascending: false })
          .order("name", { ascending: true });

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
    const loc = (opts?.location || "").trim();
    const cat = opts?.category || "";
    const verified = opts?.verifiedOnly || false;

    let query = supabase.from("businesses").select("*");

    if (loc) {
      const pattern = `%${loc}%`;
      query = query.or(
        `city.ilike.${pattern},zip.ilike.${pattern},name.ilike.${pattern}`
      );
    }

    if (cat) {
      query = query.eq("category", cat);
    }

    if (verified) {
      query = query.eq("verified", true);
    }

    const { data, error } = await query
      .order("verified", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      throw error;
    }

    const results = (data || []) as Business[];

    supabase
      .from("search_events")
      .insert({
        location: loc || null,
        category: cat || null,
        verified_only: verified,
        result_count: results.length,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error("Error logging search event:", logError);
        }
      });

    return results;
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setActiveQuickFilter(null);

    try {
      const data = await fetchBusinesses({
        location,
        category,
        verifiedOnly,
      });
      setResults(data);
    } catch {
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setLocation("");
    setCategory("");
    setVerifiedOnly(false);
    setResults([]);
    setHasSearched(false);
    setError(null);
    setActiveQuickFilter(null);
  };

  const applyQuickFilter = async (filter: QuickFilter) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setActiveQuickFilter(filter.id);

    const nextLocation = filter.location ?? "";
    const nextCategory = filter.category ?? "";
    const nextVerified = filter.verifiedOnly ?? false;

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
    } catch {
      setError("Something went wrong while applying this filter.");
    } finally {
      setLoading(false);
    }
  };

  const renderBusinessCard = (b: Business) => {
    const hasAddress = b.address || b.city || b.state || b.zip;

    return (
      <a
        key={b.id}
        href={`/business/${b.id}`}
        className="group rounded-2xl border border-slate-800 bg-black/70 px-4 py-4 text-sm text-slate-200 shadow-[0_0_20px_rgba(15,23,42,0.7)] transition-transform 'hover:-translate-y-0.5' hover:border-purple-500/70 hover:shadow-[0_0_30px_rgba(147,51,234,0.45)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-50 group-hover:text-purple-100">
              {b.name}
            </h3>
            {hasAddress && (
              <p className="text-[11px] text-slate-400">
                {b.address && <>{b.address}, </>}
                {b.city && <>{b.city}, </>}
                {b.state && <>{b.state} </>}
                {b.zip && <>{b.zip}</>}
              </p>
            )}
            {b.category && (
              <p className="text-[11px] text-slate-400 capitalize">
                {b.category}
                {b.area && <> • {b.area}</>}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {b.verified && (
              <span className="inline-flex items-center rounded-full bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-50">
                Verified
              </span>
            )}
            {b.featured && (
              <span className="inline-flex items-center rounded-full bg-purple-600/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                Featured
              </span>
            )}
          </div>
        </div>

        {b.description && (
          <p className="mt-3 line-clamp-2 text-[12px] text-slate-300">
            {b.description}
          </p>
        )}
      </a>
    );
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Search + filters */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-slate-800 bg-black/80 px-4 py-5 sm:px-6 sm:py-6 shadow-[0_0_32px_rgba(15,23,42,0.9)] space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-[2fr,1.3fr] sm:items-end">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Name, city, or ZIP
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: Riverside, 32204, Soul Food…"
              className="w-full rounded-xl border border-slate-700 bg-black/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.4fr,auto] sm:items-end">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-black/80 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-black/80 text-purple-500 focus:ring-purple-500"
                />
                Verified only
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-purple-500 via-fuchsia-500 to-purple-400 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.85)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching…" : "Search"}
            </button>
            {(location || category || verifiedOnly || hasSearched) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-black/70 px-3 py-2 text-[11px] font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100"
              >
                Clear
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Searches are focused on Jacksonville, FL.
          </p>
        </div>
      </form>

      {/* Quick filters */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Quick filters
        </p>
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => {
            const active = activeQuickFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => applyQuickFilter(filter)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  active
                    ? "border-purple-500 bg-purple-600/30 text-purple-100 shadow-[0_0_16px_rgba(147,51,234,0.7)]"
                    : "border-slate-700 bg-black/60 text-slate-300 hover:border-purple-500/70 hover:text-purple-100"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/60 px-4 py-3 text-[12px] text-red-200">
          {error}
        </div>
      )}

      {!hasSearched && !error && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-[0.18em]">
              Featured
            </span>
            <span>
              {loadingFeatured
                ? "Loading featured businesses…"
                : featured.length === 0
                ? "No featured businesses yet."
                : `${featured.length} featured business${
                    featured.length === 1 ? "" : "es"
                  }`}
            </span>
          </div>

          {featured.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {featured.map((b) => renderBusinessCard(b))}
            </div>
          )}
        </section>
      )}

      {hasSearched && !error && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>
              {loading
                ? "Searching…"
                : results.length === 0
                ? "No businesses found for this search."
                : `Showing ${results.length} business${
                    results.length === 1 ? "" : "es"
                  }.`}
            </span>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[11px] text-purple-300 hover:text-purple-200 underline underline-offset-2"
            >
              Reset search
            </button>
          </div>

          {results.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((b) => renderBusinessCard(b))}
            </div>
          )}

          {!loading && results.length === 0 && (
            <p className="text-[11px] text-slate-400">
              Can’t find what you’re looking for{" "}
              <a
                href="/suggest-business"
                className="text-purple-300 underline underline-offset-2 hover:text-purple-100"
              >
                Suggest a business.
              </a>
            </p>
          )}
        </section>
      )}

      {!error &&
        !hasSearched &&
        !loading &&
        !loadingFeatured &&
        featured.length === 0 && (
          <p className="text-[11px] text-slate-400">
            Use the search above to discover Black-owned businesses in your
            area.
          </p>
        )}
    </div>
  );
}
