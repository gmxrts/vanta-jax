import { useState, useEffect, lazy, Suspense } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

const BrowseMapView = lazy(() => import("./BrowseMapView"));

type Business = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  verified: boolean;
  featured?: boolean | null;
  area?: string | null;
  // Privacy & type fields
  business_type?: string | null;
  is_address_public?: boolean | null;
  public_location_label?: string | null;
  service_area?: string | null;
  // Coordinates
  latitude?: number | null;
  longitude?: number | null;
};

const categories = [
  { value: "", label: "All categories" },
  { value: "food", label: "Food & Dining" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health & Wellness" },
  { value: "nonprofit", label: "Nonprofit & Community" },
  { value: "other", label: "Other" },
];

/** Returns the display location string based on privacy rules. */
function getLocationLabel(b: Business): string | null {
  const type = b.business_type;

  if (type === "online_only") return null;

  if (type === "service_based") {
    if (b.service_area) return `Serves: ${b.service_area}`;
    if (b.public_location_label) return b.public_location_label;
    return "Jacksonville, FL area";
  }

  // brick_and_mortar or unknown type
  if (b.is_address_public === false) {
    return b.public_location_label || null;
  }

  // Public address — assemble from parts
  const parts: string[] = [];
  if (b.address) parts.push(b.address);
  if (b.city) parts.push(b.city);
  if (b.state) parts.push(b.state);
  if (b.zip) parts.push(b.zip);
  return parts.length > 0 ? parts.join(", ") : null;
}

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN ?? "";

export default function BusinessSearch() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [featured, setFeatured] = useState<Business[]>([]);
  const [directory, setDirectory] = useState<Business[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoadingDirectory(true);
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .order("verified", { ascending: false })
          .order("name", { ascending: true });

        if (error) {
          console.error(error);
          return;
        }

        const all = (data || []) as Business[];
        setDirectory(all);
        setFeatured(all.filter((b) => b.featured));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDirectory(false);
      }
    };

    loadAll();
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
  };

  const renderBusinessCard = (b: Business) => {
    const locationLabel = getLocationLabel(b);
    const isOnline = b.business_type === "online_only";
    const isMobile = b.business_type === "service_based";

    return (
      <a
        key={b.id}
        href={`/business/${b.id}`}
        className="vj-card-tight group block text-sm text-slate-800"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700">
              {b.name}
            </h3>

            {locationLabel && (
              <p className="text-[11px] text-slate-500 truncate">
                {isMobile && (
                  <span className="mr-1 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Mobile
                  </span>
                )}
                {locationLabel}
              </p>
            )}

            {isOnline && (
              <p className="text-[11px] text-slate-500">Online only</p>
            )}

            {b.category && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                {b.category}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
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

  const activeList = hasSearched ? results : directory;

  return (
    <div className="w-full flex flex-col items-center gap-8">
      {/* PRIMARY SEARCH AREA */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-2xl flex flex-col items-center gap-4"
      >
        <div className="w-full">
          <div className="relative">
            <div className="vj-searchbar-sheen" />
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

        {/* secondary controls */}
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

      {error && (
        <div className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* FEATURED SECTION (only when not searching) */}
      {!hasSearched && !error && featured.length > 0 && (
        <section className="w-full max-w-4xl space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold uppercase tracking-[0.18em]">
              Featured
            </span>
            <span>
              {featured.length} featured business{featured.length === 1 ? "" : "es"}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((b) => renderBusinessCard(b))}
          </div>
        </section>
      )}

      {/* DIRECTORY / SEARCH RESULTS */}
      {!error && (hasSearched || directory.length > 0) && (
        <section className="w-full max-w-4xl space-y-3">
          {/* Header row: label + count + view toggle */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="font-semibold uppercase tracking-[0.18em]">
                {hasSearched ? "Results" : "Directory"}
              </span>
              <span>
                {loading || loadingDirectory
                  ? "Loading…"
                  : hasSearched
                  ? results.length === 0
                    ? "No businesses found"
                    : `Showing ${results.length} business${results.length === 1 ? "" : "es"}`
                  : `Showing ${directory.length} business${directory.length === 1 ? "" : "es"}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {hasSearched && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mr-2 text-[11px] text-purple-700 hover:text-purple-900 underline underline-offset-2"
                >
                  Reset
                </button>
              )}

              {/* List / Map toggle */}
              {MAPBOX_TOKEN && (
                <div className="flex items-center rounded-full border border-slate-200 bg-white/80 p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      viewMode === "list"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("map")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      viewMode === "map"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Map
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map view */}
          {viewMode === "map" && MAPBOX_TOKEN && (
            <Suspense
              fallback={
                <div
                  style={{
                    height: "520px",
                    borderRadius: "20px",
                    background: "#f8fafc",
                    border: "1px solid rgba(226,232,240,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="text-[12px] text-slate-400">
                    Loading map…
                  </span>
                </div>
              }
            >
              <BrowseMapView
                businesses={activeList}
                token={MAPBOX_TOKEN}
              />
            </Suspense>
          )}

          {/* List view */}
          {viewMode === "list" && !loading && !loadingDirectory && activeList.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeList.map((b) => renderBusinessCard(b))}
            </div>
          )}

          {/* Empty state */}
          {viewMode === "list" && !loading && !loadingDirectory && activeList.length === 0 && (
            <p className="text-[11px] text-slate-500">
              {hasSearched
                ? "Can't find what you're looking for? "
                : "No businesses in the directory yet. "}
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

      {/* EMPTY STATE */}
      {!error &&
        !hasSearched &&
        !loading &&
        !loadingDirectory &&
        directory.length === 0 && (
          <p className="w-full max-w-3xl text-[11px] text-slate-500">
            Use the search above to discover Black-owned businesses in your
            area.
          </p>
        )}
    </div>
  );
}
