import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

type Suggestion = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  promoted_to_business_id?: string | null;
};

type Props = {
  suggestions: Suggestion[];
  businesses?: LiveBusiness[];
  mapboxToken?: string;
};

type LiveBusiness = {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  verified: boolean;
  featured: boolean | null;
  business_type: string | null;
  is_address_public: boolean | null;
  public_location_label: string | null;
  service_area: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type GeoFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

const categories = [
  { value: "food", label: "Food & Dining" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health & Wellness" },
  { value: "nonprofit", label: "Nonprofit & Community" },
  { value: "other", label: "Other" },
];

const businessTypes = [
  { value: "brick_and_mortar", label: "Brick & Mortar" },
  { value: "service_based", label: "Service-Based / Mobile" },
  { value: "online_only", label: "Online Only" },
];

type QuickSettings = { category: string; verified: boolean };

// ─── helpers ────────────────────────────────────────────────────────────────

function formatWhen(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function safeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function compactLocation(city: string | null, state: string | null) {
  const c = (city ?? "").trim();
  const s = (state ?? "").trim();
  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  if (s) return s;
  return "—";
}

function inferStatus(s: Suggestion): "Imported" | "Community" {
  const notes = (s.notes ?? "").toLowerCase();
  const website = (s.website ?? "").toLowerCase();
  const importedSignals = [
    "blackjaxconnect.com",
    "import",
    "imported",
    "batch",
    "scrape",
    "scraped",
    "source:",
    "seed",
    "migration",
  ];
  if (importedSignals.some((k) => notes.includes(k))) return "Imported";
  if (website.includes("blackjaxconnect.com")) return "Imported";
  return "Community";
}

// ─── AddressAutofill ─────────────────────────────────────────────────────────

function AddressAutofill({
  token,
  onSelect,
}: {
  token: string;
  onSelect: (data: {
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim() || q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=US&types=address&limit=5&autocomplete=true&proximity=-81.6557,30.3322`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.features ?? []);
        setOpen((data.features ?? []).length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const pick = (feature: GeoFeature) => {
    const [lng, lat] = feature.center;
    const ctx = feature.context ?? [];

    const parts = feature.place_name.split(",").map((s) => s.trim());
    const address = parts[0] ?? "";

    let city = "";
    let state = "";
    let zip = "";

    for (const c of ctx) {
      if (c.id.startsWith("place.") || c.id.startsWith("locality.")) city = c.text;
      if (c.id.startsWith("region.")) {
        state = c.short_code ? c.short_code.replace("US-", "") : c.text;
      }
      if (c.id.startsWith("postcode.")) zip = c.text;
    }

    setQuery(feature.place_name);
    setResults([]);
    setOpen(false);
    onSelect({ address, city, state, zip, lat, lng });
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Start typing an address to search & auto-fill coordinates…"
          className="w-full rounded-2xl border border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-300"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
            Searching…
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              onMouseDown={() => pick(f)}
              className="w-full border-b border-slate-100 px-4 py-3 text-left text-[12px] text-slate-700 transition last:border-0 hover:bg-purple-50"
            >
              {f.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EditForm ────────────────────────────────────────────────────────────────

function EditForm({
  suggestion,
  mapboxToken,
  initialCategory,
  initialVerified,
  onSubmit,
  isPromoting,
}: {
  suggestion: Suggestion;
  mapboxToken?: string;
  initialCategory: string;
  initialVerified: boolean;
  onSubmit: (payload: Record<string, any>) => Promise<void>;
  isPromoting: boolean;
}) {
  const [businessType, setBusinessType] = useState("");
  const [isAddressPublic, setIsAddressPublic] = useState(true);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(suggestion.city ?? "");
  const [state, setState] = useState(suggestion.state ?? "FL");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [coordsFilled, setCoordsFilled] = useState(false);

  const handleTypeChange = (type: string) => {
    setBusinessType(type);
    setIsAddressPublic(type === "brick_and_mortar");
  };

  const handleGeoSelect = (data: {
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  }) => {
    setAddress(data.address);
    setCity(data.city);
    setState(data.state);
    setZip(data.zip);
    setLat(data.lat);
    setLng(data.lng);
    setCoordsFilled(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, any> = {
      suggestionId: suggestion.id,
      name: (fd.get("name") as string)?.trim(),
      category: (fd.get("category") as string) || "services",
      business_type: businessType || null,
      is_address_public: isAddressPublic,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip: zip.trim() || null,
      phone: (fd.get("phone") as string)?.trim() || null,
      website: (fd.get("website") as string)?.trim() || null,
      logo_url: (fd.get("logo_url") as string)?.trim() || null,
      description: (fd.get("description") as string)?.trim() || null,
      service_area: (fd.get("service_area") as string)?.trim() || null,
      public_location_label:
        (fd.get("public_location_label") as string)?.trim() || null,
      verified: fd.get("verified") === "on",
    };

    if (lat !== null) payload.latitude = lat;
    if (lng !== null) payload.longitude = lng;

    await onSubmit(payload);
  };

  const showAddress = businessType !== "online_only";
  const showServiceArea = businessType === "service_based";
  const showLocationLabel =
    businessType === "service_based" ||
    (businessType !== "" && !isAddressPublic);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Category */}
      <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Business name <span className="text-purple-600">*</span>
          </label>
          <input
            name="name"
            defaultValue={suggestion.name}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Category
          </label>
          <select
            name="category"
            defaultValue={initialCategory}
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Business type */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Business type{" "}
          <span className="normal-case text-slate-400 tracking-normal font-normal">
            (auto-sets address privacy)
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {businessTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={
                "rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition " +
                (businessType === t.value
                  ? "border-purple-300 bg-purple-50 text-purple-700 shadow-sm"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:border-purple-200 hover:bg-purple-50/40")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {businessType && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">Address public:</span>
            <span
              className={
                isAddressPublic
                  ? "font-semibold text-emerald-600"
                  : "font-semibold text-amber-600"
              }
            >
              {isAddressPublic ? "Yes" : "No (private)"}
            </span>
            {businessType !== "online_only" && (
              <button
                type="button"
                onClick={() => setIsAddressPublic((v) => !v)}
                className="ml-1 text-slate-400 underline underline-offset-2 hover:text-slate-600"
              >
                override
              </button>
            )}
          </div>
        )}
      </div>

      {/* Address section */}
      {showAddress && (
        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Address
            {mapboxToken && (
              <span className="ml-1 font-normal normal-case tracking-normal text-purple-500">
                — type to search & auto-fill coordinates
              </span>
            )}
          </p>

          {mapboxToken && (
            <AddressAutofill token={mapboxToken} onSelect={handleGeoSelect} />
          )}

          <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500">
                Street address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm uppercase text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">
                  ZIP
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
          </div>

          {/* Coordinates status */}
          {coordsFilled && lat !== null && lng !== null ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
              <span className="text-emerald-500 text-[13px]">✓</span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Coordinates auto-filled:{" "}
                <span className="font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </span>
            </div>
          ) : mapboxToken ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2">
              <span className="text-slate-400 text-[13px]">○</span>
              <span className="text-[11px] text-slate-500">
                Search an address above to auto-fill lat/lng
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Service area */}
      {showServiceArea && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Service area
          </label>
          <input
            name="service_area"
            placeholder="e.g. Jacksonville & surrounding areas"
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      )}

      {/* Public location label */}
      {showLocationLabel && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Public location label{" "}
            <span className="normal-case font-normal tracking-normal text-slate-400">
              (shown instead of address)
            </span>
          </label>
          <input
            name="public_location_label"
            placeholder="e.g. Jacksonville, FL"
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      )}

      {/* Contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Phone
          </label>
          <input
            name="phone"
            placeholder="e.g. 904-555-1234"
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Website / social
          </label>
          <input
            name="website"
            defaultValue={suggestion.website ?? ""}
            placeholder="https://…"
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </div>

      {/* Logo URL */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Logo URL
        </label>
        <input
          name="logo_url"
          placeholder="https://… (direct image link)"
          className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Description
        </label>
        <textarea
          name="description"
          defaultValue={suggestion.notes ?? ""}
          rows={3}
          placeholder="Short description for the directory listing"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 shadow-sm backdrop-blur">
          <input
            type="checkbox"
            name="verified"
            defaultChecked={initialVerified}
            className="h-4 w-4 accent-purple-600"
          />
          <span className="text-[12px] text-slate-700">
            Mark as verified Black-owned
          </span>
        </label>

        <button
          type="submit"
          disabled={isPromoting}
          className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_16px_34px_-22px_rgba(147,51,234,0.75)] transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPromoting ? "Publishing…" : "Approve & Publish"}
        </button>
      </div>
    </form>
  );
}

// ─── EditListingForm ─────────────────────────────────────────────────────────

function EditListingForm({
  business,
  mapboxToken,
  onSaved,
  onCancel,
}: {
  business: LiveBusiness;
  mapboxToken?: string;
  onSaved: (updated: LiveBusiness) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState(business.business_type ?? "");
  const [isAddressPublic, setIsAddressPublic] = useState(business.is_address_public !== false);
  const [address, setAddress] = useState(business.address ?? "");
  const [city, setCity] = useState(business.city ?? "");
  const [stateVal, setStateVal] = useState(business.state ?? "");
  const [zip, setZip] = useState(business.zip ?? "");
  const [lat, setLat] = useState<number | null>(business.latitude ?? null);
  const [lng, setLng] = useState<number | null>(business.longitude ?? null);
  const [coordsFilled, setCoordsFilled] = useState(false);

  const handleTypeChange = (type: string) => {
    setBusinessType(type);
    setIsAddressPublic(type === "brick_and_mortar");
  };

  const handleGeoSelect = (data: { address: string; city: string; state: string; zip: string; lat: number; lng: number }) => {
    setAddress(data.address);
    setCity(data.city);
    setStateVal(data.state);
    setZip(data.zip);
    setLat(data.lat);
    setLng(data.lng);
    setCoordsFilled(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, any> = {
      businessId: business.id,
      name: (fd.get("name") as string)?.trim(),
      category: (fd.get("category") as string) || "services",
      business_type: businessType || null,
      is_address_public: isAddressPublic,
      address: address.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      zip: zip.trim() || null,
      phone: (fd.get("phone") as string)?.trim() || null,
      website: (fd.get("website") as string)?.trim() || null,
      logo_url: (fd.get("logo_url") as string)?.trim() || null,
      description: (fd.get("description") as string)?.trim() || null,
      service_area: (fd.get("service_area") as string)?.trim() || null,
      public_location_label: (fd.get("public_location_label") as string)?.trim() || null,
      verified: fd.get("verified") === "on",
      featured: fd.get("featured") === "on",
    };
    if (lat !== null) payload.latitude = lat;
    if (lng !== null) payload.longitude = lng;

    try {
      const res = await fetch("/api/edit-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save changes.");
      onSaved({ ...business, ...payload, id: business.id });
    } catch (err: any) {
      setError(err?.message || "Unexpected error saving.");
    } finally {
      setSaving(false);
    }
  };

  const showAddress = businessType !== "online_only";
  const showServiceArea = businessType === "service_based";
  const showLocationLabel = businessType === "service_based" || (businessType !== "" && !isAddressPublic);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[12px] text-red-700">{error}</div>
      )}

      {/* Name + Category */}
      <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Business name <span className="text-purple-600">*</span></label>
          <input name="name" defaultValue={business.name} required className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Category</label>
          <select name="category" defaultValue={business.category ?? "services"} className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200">
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Business type */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Business type</label>
        <div className="grid grid-cols-3 gap-2">
          {businessTypes.map((t) => (
            <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)}
              className={"rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition " + (businessType === t.value ? "border-purple-300 bg-purple-50 text-purple-700 shadow-sm" : "border-slate-200 bg-white/70 text-slate-700 hover:border-purple-200 hover:bg-purple-50/40")}
            >{t.label}</button>
          ))}
        </div>
        {businessType && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">Address public:</span>
            <span className={isAddressPublic ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
              {isAddressPublic ? "Yes" : "No (private)"}
            </span>
            {businessType !== "online_only" && (
              <button type="button" onClick={() => setIsAddressPublic((v) => !v)} className="ml-1 text-slate-400 underline underline-offset-2 hover:text-slate-600">override</button>
            )}
          </div>
        )}
      </div>

      {/* Address section */}
      {showAddress && (
        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Address{mapboxToken && <span className="ml-1 font-normal normal-case tracking-normal text-purple-500">— type to search & auto-fill coordinates</span>}
          </p>
          {mapboxToken && <AddressAutofill token={mapboxToken} onSelect={handleGeoSelect} />}
          <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500">Street address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">State</label>
                <input type="text" value={stateVal} onChange={(e) => setStateVal(e.target.value)} maxLength={2} className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm uppercase text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">ZIP</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
            </div>
          </div>
          {coordsFilled && lat !== null && lng !== null ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
              <span className="text-emerald-500 text-[13px]">✓</span>
              <span className="text-[11px] text-emerald-700 font-medium">Coordinates: <span className="font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span></span>
            </div>
          ) : lat !== null ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2">
              <span className="text-slate-400 text-[13px]">○</span>
              <span className="text-[11px] text-slate-500">Current coords: {lat?.toFixed(5)}, {lng?.toFixed(5)}</span>
            </div>
          ) : mapboxToken ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2">
              <span className="text-slate-400 text-[13px]">○</span>
              <span className="text-[11px] text-slate-500">Search above to auto-fill lat/lng</span>
            </div>
          ) : null}
        </div>
      )}

      {showServiceArea && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Service area</label>
          <input name="service_area" defaultValue={business.service_area ?? ""} placeholder="e.g. Jacksonville & surrounding areas" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      )}

      {showLocationLabel && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Public location label <span className="normal-case font-normal tracking-normal text-slate-400">(shown instead of address)</span></label>
          <input name="public_location_label" defaultValue={business.public_location_label ?? ""} placeholder="e.g. Jacksonville, FL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      )}

      {/* Contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Phone</label>
          <input name="phone" defaultValue={business.phone ?? ""} placeholder="e.g. 904-555-1234" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Website / social</label>
          <input name="website" defaultValue={business.website ?? ""} placeholder="https://…" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      </div>

      {/* Logo URL */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Logo URL</label>
        <input name="logo_url" defaultValue={business.logo_url ?? ""} placeholder="https://… (direct image link)" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Description</label>
        <textarea name="description" defaultValue={business.description ?? ""} rows={3} placeholder="Short description for the directory listing" className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 shadow-sm backdrop-blur">
            <input type="checkbox" name="verified" defaultChecked={business.verified} className="h-4 w-4 accent-purple-600" />
            <span className="text-[12px] text-slate-700">Verified</span>
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 shadow-sm backdrop-blur">
            <input type="checkbox" name="featured" defaultChecked={business.featured ?? false} className="h-4 w-4 accent-purple-600" />
            <span className="text-[12px] text-slate-700">Featured</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-2.5 text-[13px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_16px_34px_-22px_rgba(147,51,234,0.75)] transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── LiveListings ─────────────────────────────────────────────────────────────

function LiveListings({ businesses, mapboxToken }: { businesses: LiveBusiness[]; mapboxToken?: string }) {
  const [items, setItems] = useState<LiveBusiness[]>(businesses ?? []);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const normalized = filter.trim().toLowerCase();
  const filtered = normalized
    ? items.filter((b) => [b.name, b.city ?? "", b.category ?? ""].join(" ").toLowerCase().includes(normalized))
    : items;

  const handleSaved = (updated: LiveBusiness) => {
    setItems((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setEditingId(null);
    setMessage(`"${updated.name}" updated successfully.`);
    setTimeout(() => setMessage(null), 4000);
  };

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-[0_16px_40px_-34px_rgba(2,6,23,0.7)] backdrop-blur">
        <p className="text-sm font-semibold text-slate-900">No live listings yet.</p>
        <p className="mt-2 text-[11px] text-slate-600">Approved businesses will appear here for editing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-900">{filtered.length} / {items.length}</span>{" "}listings visible
          {normalized && <span className="text-slate-500"> (filtered)</span>}
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, city, category…"
          className="w-full sm:w-[320px] rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-[12px] text-emerald-700">{message}</div>
      )}

      <div className="space-y-4">
        {filtered.map((b) => {
          const isEditing = editingId === b.id;
          return (
            <article key={b.id} className="rounded-[28px] border border-slate-200/70 bg-white/70 shadow-[0_18px_48px_-40px_rgba(2,6,23,0.7)] backdrop-blur overflow-hidden">
              <div className="px-5 sm:px-7 py-4 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{b.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      {b.category && (
                        <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm capitalize">{b.category}</span>
                      )}
                      <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm">{compactLocation(b.city, b.state)}</span>
                      {b.verified && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 shadow-sm">Verified</span>}
                      {b.featured && <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700 shadow-sm">Featured</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <a href={`/business/${b.id}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                      View →
                    </a>
                    <button type="button" onClick={() => setEditingId(isEditing ? null : b.id)}
                      className={"rounded-2xl border px-3 py-2 text-[12px] font-semibold shadow-sm backdrop-blur transition hover:-translate-y-0.5 " + (isEditing ? "border-purple-300 bg-purple-50 text-purple-700" : "border-slate-200 bg-white/70 text-slate-800 hover:bg-white")}
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-5">
                    <div className="h-px w-full bg-slate-200/70 mb-5" />
                    <EditListingForm
                      business={b}
                      mapboxToken={mapboxToken}
                      onSaved={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ─── AdminDashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard({ suggestions, businesses, mapboxToken }: Props) {
  const [activeTab, setActiveTab] = useState<"suggestions" | "live">("suggestions");
  const [items, setItems] = useState<Suggestion[]>(suggestions ?? []);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [editIds, setEditIds] = useState<Set<string>>(() => new Set());

  const [filter, setFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickSettings, setQuickSettings] = useState<Record<string, QuickSettings>>(() => ({}));

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setEditOpen = (id: string, open: boolean) => {
    setEditIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const openAll = () => setOpenIds(new Set(items.map((i) => i.id)));
  const closeAll = () => {
    setOpenIds(new Set());
    setEditIds(new Set());
  };

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const base = !normalizedFilter
      ? items
      : items.filter((s) => {
          const haystack = [s.name, s.city ?? "", s.state ?? "", s.notes ?? "", s.website ?? ""]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedFilter);
        });
    return onlyOpen ? base.filter((s) => openIds.has(s.id)) : base;
  }, [items, normalizedFilter, onlyOpen, openIds]);

  useEffect(() => {
    if (!filteredItems.length) { setSelectedId(null); return; }
    if (!selectedId || !filteredItems.some((x) => x.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const totalCount = items.length;
  const visibleCount = filteredItems.length;

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setOpenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setEditIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setQuickSettings((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (selectedId === id) setSelectedId(null);
  };

  const postPromote = async (payload: any) => {
    const res = await fetch("/api/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to promote suggestion.");
    return data;
  };

  const handlePromoteQuick = async (
    suggestion: Suggestion,
    category: string,
    verified: boolean
  ) => {
    setGlobalError(null);
    setGlobalMessage(null);
    setPromotingId(suggestion.id);
    try {
      const payload = {
        suggestionId: suggestion.id,
        name: suggestion.name?.trim(),
        category: category || "services",
        address: null,
        city: suggestion.city ?? null,
        state: suggestion.state ?? null,
        zip: null,
        phone: null,
        website: suggestion.website?.trim() || null,
        description: suggestion.notes?.trim() || null,
        verified,
      };
      if (!payload.name) throw new Error("Name is required.");
      await postPromote(payload);
      removeItem(suggestion.id);
      setGlobalMessage("Promoted (quick) successfully.");
    } catch (err: any) {
      setGlobalError(err?.message || "Unexpected error promoting suggestion.");
    } finally {
      setPromotingId(null);
    }
  };

  const handlePromoteFull = async (payload: Record<string, any>) => {
    setGlobalError(null);
    setGlobalMessage(null);

    if (!payload.name) {
      setGlobalError("Name is required.");
      return;
    }

    setPromotingId(payload.suggestionId);
    try {
      await postPromote(payload);
      removeItem(payload.suggestionId);
      setGlobalMessage("Approved & published successfully.");
    } catch (err: any) {
      setGlobalError(err?.message || "Unexpected error publishing.");
    } finally {
      setPromotingId(null);
    }
  };

  const handleReject = async (suggestionId: string) => {
    setGlobalError(null);
    setGlobalMessage(null);
    const confirmed = window.confirm("Reject and remove this suggestion?");
    if (!confirmed) return;
    setRejectingId(suggestionId);
    try {
      const res = await fetch("/api/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to reject suggestion.");
      removeItem(suggestionId);
      setGlobalMessage("Suggestion rejected and removed.");
    } catch (err: any) {
      setGlobalError(err?.message || "Unexpected error rejecting suggestion.");
    } finally {
      setRejectingId(null);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!filteredItems.length) return;
      const key = e.key.toLowerCase();

      if (key === "j" || key === "k") {
        e.preventDefault();
        const idx = Math.max(0, filteredItems.findIndex((x) => x.id === selectedId));
        const nextIdx = key === "j"
          ? Math.min(filteredItems.length - 1, idx + 1)
          : Math.max(0, idx - 1);
        setSelectedId(filteredItems[nextIdx].id);
        return;
      }
      if (key === "enter") { e.preventDefault(); if (selectedId) toggleOpen(selectedId); return; }
      if (key === "e") {
        e.preventDefault();
        if (!selectedId) return;
        setEditOpen(selectedId, !editIds.has(selectedId));
        return;
      }
      if (key === "escape") {
        e.preventDefault();
        if (!selectedId) return;
        if (editIds.has(selectedId)) setEditOpen(selectedId, false);
        else if (openIds.has(selectedId)) toggleOpen(selectedId);
        return;
      }
      if (key === "p") {
        e.preventDefault();
        if (!selectedId) return;
        const s = filteredItems.find((x) => x.id === selectedId);
        if (!s) return;
        const qs = quickSettings[selectedId] ?? { category: "services", verified: true };
        const ok = window.confirm(`Quick promote "${s.name}" as "${qs.category}"?`);
        if (!ok) return;
        handlePromoteQuick(s, qs.category, qs.verified);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, selectedId, openIds, editIds, quickSettings]);

  const tabBar = (
    <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/70 p-1 shadow-sm w-fit backdrop-blur">
      <button
        type="button"
        onClick={() => setActiveTab("suggestions")}
        className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition ${activeTab === "suggestions" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
      >
        Suggestions{" "}
        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "suggestions" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
          {totalCount}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("live")}
        className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition ${activeTab === "live" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
      >
        Live Listings{" "}
        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "live" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
          {businesses?.length ?? 0}
        </span>
      </button>
    </div>
  );

  if (!totalCount && activeTab === "suggestions") {
    return (
      <div className="space-y-5">
        {tabBar}
        {activeTab === "suggestions" ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-[0_16px_40px_-34px_rgba(2,6,23,0.7)] backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">No suggestions waiting for review.</p>
            <p className="mt-2 text-[11px] text-slate-600">When supporters submit new businesses, they will appear here.</p>
          </div>
        ) : (
          <LiveListings businesses={businesses ?? []} mapboxToken={mapboxToken} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {tabBar}
      {activeTab === "live" && (
        <LiveListings businesses={businesses ?? []} mapboxToken={mapboxToken} />
      )}
      {activeTab === "suggestions" && <div className="space-y-5">
      {/* Control bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-900">
            {visibleCount} / {totalCount}
          </span>{" "}
          suggestions visible
          {normalizedFilter && <span className="text-slate-500"> (filtered)</span>}
          <span className="ml-2 rounded-full border border-slate-200 bg-white/60 px-2.5 py-1 text-[10px] text-slate-600 shadow-sm backdrop-blur">
            Shortcuts: J/K • Enter • P • E • Esc
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, city, notes…"
            className="w-full sm:w-[320px] rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAll}
              className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={closeAll}
              className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            >
              Collapse all
            </button>
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-3 py-2 shadow-sm backdrop-blur">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              <span className="text-[12px] text-slate-700">Show open</span>
            </label>
          </div>
        </div>
      </div>

      {globalError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[12px] text-red-700">
          {globalError}
        </div>
      )}
      {globalMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-[12px] text-emerald-700">
          {globalMessage}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">{filteredItems.map((s) => {
          const isOpen = openIds.has(s.id);
          const isEditing = editIds.has(s.id);
          const isSelected = selectedId === s.id;
          const hasWebsite = Boolean(s.website && s.website.trim().length > 0);
          const hasNotes = Boolean(s.notes && s.notes.trim().length > 0);
          const status = inferStatus(s);
          const qs = quickSettings[s.id] ?? { category: "services", verified: true };

          return (
            <div
              key={s.id}
              ref={(el) => { rowRefs.current[s.id] = el; }}
            >
              <article
                className={
                  "rounded-[28px] border bg-white/70 shadow-[0_18px_48px_-40px_rgba(2,6,23,0.7)] backdrop-blur overflow-hidden " +
                  (isSelected
                    ? "border-purple-300 ring-2 ring-purple-200"
                    : "border-slate-200/70")
                }
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => { setSelectedId(s.id); toggleOpen(s.id); }}
                  className="w-full text-left px-5 sm:px-7 py-4 sm:py-5 hover:bg-white/35 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Submission
                      </p>
                      <h2 className="mt-1 text-base sm:text-lg font-semibold text-slate-900 truncate">
                        {s.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                        <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm">
                          {compactLocation(s.city, s.state)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm">
                          {formatWhen(s.created_at)}
                        </span>
                        <span
                          className={
                            status === "Imported"
                              ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 shadow-sm"
                              : "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 shadow-sm"
                          }
                        >
                          {status}
                        </span>
                        {hasWebsite && (
                          <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700 shadow-sm">
                            Has link
                          </span>
                        )}
                        {hasNotes && (
                          <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm">
                            Has notes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center">
                      <span className="text-slate-400 text-base leading-none">{isOpen ? "▾" : "▸"}</span>
                    </div>
                  </div>
                </button>

                {/* Body */}
                {isOpen && (
                  <div className="px-5 sm:px-7 pb-6">
                    <div className="h-px w-full bg-slate-200/70 mb-5" />

                    {/* Quick actions row */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {hasWebsite && (
                          <>
                            <a
                              href={safeUrl(s.website as string)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                            >
                              Open link →
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(safeUrl(s.website as string));
                                  setGlobalMessage("Website link copied.");
                                  setGlobalError(null);
                                } catch {
                                  setGlobalError("Couldn't copy link (blocked).");
                                  setGlobalMessage(null);
                                }
                              }}
                              className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                            >
                              Copy link
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditOpen(s.id, !isEditing)}
                          className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                        >
                          {isEditing ? "Hide details" : "Edit details"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReject(s.id)}
                        disabled={rejectingId === s.id}
                        className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2 text-[12px] font-semibold text-red-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rejectingId === s.id ? "Rejecting…" : "Reject"}
                      </button>
                    </div>

                    {/* Quick promote */}
                    <div className="mt-4 rounded-[22px] border border-slate-200/70 bg-white/55 p-4 shadow-sm backdrop-blur">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Quick promote
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Shortcut: <span className="font-semibold">P</span> promotes selected.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={qs.category}
                            onChange={(e) =>
                              setQuickSettings((prev) => ({
                                ...prev,
                                [s.id]: { ...qs, category: e.target.value },
                              }))
                            }
                            className="w-full sm:w-[220px] rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] text-slate-900 shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-purple-200"
                          >
                            {categories.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-3 py-2 shadow-sm backdrop-blur">
                            <input
                              type="checkbox"
                              checked={qs.verified}
                              onChange={(e) =>
                                setQuickSettings((prev) => ({
                                  ...prev,
                                  [s.id]: { ...qs, verified: e.target.checked },
                                }))
                              }
                              className="h-4 w-4 accent-purple-600"
                            />
                            <span className="text-[12px] text-slate-700">Verified</span>
                          </label>
                          <button
                            type="button"
                            disabled={promotingId === s.id}
                            onClick={() => {
                              setSelectedId(s.id);
                              const ok = window.confirm(
                                `Quick promote "${s.name}" as "${qs.category}"?`
                              );
                              if (!ok) return;
                              handlePromoteQuick(s, qs.category, qs.verified);
                            }}
                            className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_16px_34px_-22px_rgba(147,51,234,0.65)] transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {promotingId === s.id ? "Promoting…" : "Promote (quick)"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Full edit form */}
                    {isEditing && (
                      <div className="mt-5">
                        <div className="h-px w-full bg-slate-200/70 mb-5" />
                        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-600">
                          Full approval form
                        </p>
                        <EditForm
                          suggestion={s}
                          mapboxToken={mapboxToken}
                          initialCategory={qs.category}
                          initialVerified={qs.verified}
                          onSubmit={handlePromoteFull}
                          isPromoting={promotingId === s.id}
                        />
                      </div>
                    )}
                  </div>
                )}
              </article>
            </div>
          );
        })}
      </div>
    </div>}
  </div>
  );
}
