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

    const rows = (data || []) as Business[];

    // fire-and-forget metrics logging
    supabase
      .from("search_events")
      .insert({
        location: loc || null,
        category: cat || null,
        verified_only: verified,
        result_count: rows.length,
      })
      .then(({ error: logError }) => {
        if (logError) console.error("Error logging search event:", logError);
      });

    return rows;
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
        className="vj-card-tight group text-sm text-slate-800 transition hover:-translate-y-0.5 hover:border-purple-500 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700">
              {b.name}
            </h3>

            {hasAddress && (
              <p className="text-[11px] text-slate-500">
                {b.address && <>{b.address}, </>}
                {b.city && <>{b.city}, </>}
                {b.state && <>{b.state} </>}
                {b.zip && <>{b.zip}</>}
              </p>
            )}

            {b.category && (
              <p className="text-[11px] text-slate-500 capitalize">
                {b.category}
                {b.area && <> • {b.area}</>}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {b.verified && <span className="vj-badge-verified">Verified</span>}
            {b.featured && <span className="vj-badge-featured">Featured</span>}
          </div>
        </div>

        {b.description && (
          <p className="mt-3 line-clamp-2 text-[12px] text-slate-700">
            {b.description}
          </p>
        )}
      </a>
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-8">
      {/* PRIMARY SEARCH AREA – big centered bar */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-2xl flex flex-col items-center gap-4"
      >
        <div className="w-full">
          <div className="relative">
            <div className="vj-searchbar-sheen" />

            {/* Input first, then icon-button (required for focus animation CSS) */}
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search businesses, services, or categories…"
              className="vj-searchbar vj-rounded-full"
            />

            <button
              type="submit"
              className="vj-searchbar-icon-btn"
              aria-label={loading ? "Searching…" : "Search"}
              disabled={loading}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16.5 16.5 21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {(location || category || verifiedOnly || hasSearched) && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-secondary text-sm px-5 py-2"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* secondary controls under the bar */}
        <div className="flex w-full flex-wrap items-center gap-4 text-[11px] text-slate-500 justify-center">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="vj-select"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="vj-checkbox"
            />
            <span>Verified only</span>
          </label>

          <span className="text-[11px] text-slate-500">
            Searches are focused on Jacksonville, FL.
          </span>
        </div>
      </form>

      {/* QUICK FILTER CHIPS */}
      <div className="w-full max-w-3xl space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                className={active ? "vj-chip-active" : "vj-chip-default"}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* FEATURED SECTION WHEN NOT SEARCHING */}
      {!hasSearched && !error && (
        <section className="w-full max-w-3xl space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
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

      {/* SEARCH RESULTS */}
      {hasSearched && !error && (
        <section className="w-full max-w-3xl space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
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
              className="text-[11px] text-purple-700 hover:text-purple-900 underline underline-offset-2"
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
            <p className="text-[11px] text-slate-500">
              Can’t find what you’re looking for?{" "}
              <a
                href="/suggest-business"
                className="text-purple-700 underline underline-offset-2 hover:text-purple-900"
              >
                Suggest a business.
              </a>
            </p>
          )}
        </section>
      )}

      {/* EMPTY STATE WHEN NO FEATURED + NO SEARCH */}
      {!error &&
        !hasSearched &&
        !loading &&
        !loadingFeatured &&
        featured.length === 0 && (
          <p className="w-full max-w-3xl text-[11px] text-slate-500">
            Use the search above to discover Black-owned businesses in your
            area.
          </p>
        )}
    </div>
  );
}
