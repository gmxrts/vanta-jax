import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type Claim = {
  id: string;
  business_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  verification_method: string | null;
  claimed_at: string;
  approved_at: string | null;
  notes: string | null;
  profiles: { email: string; full_name: string | null } | null;
  businesses: { name: string } | null;
};

type Props = {
  suggestions: Suggestion[];
  businesses?: LiveBusiness[];
  mapboxToken?: string;
  claims?: Claim[];
  adminKey?: string;
};

type DayHours = { open: string | null; close: string | null; closed: boolean };
type HoursState = Record<string, DayHours>;

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
  woman_owned: boolean | null;
  woman_owned_requested: boolean | null;
  business_type: string | null;
  is_address_public: boolean | null;
  public_location_label: string | null;
  service_area: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: HoursState | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  is_claimed?: boolean | null;
  claimed_by?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
  outreach_sent_at?: string | null;
  outreach_count?: number | null;
};

type GeoFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

const categories = [
  { value: "food",         label: "Food & Drink" },
  { value: "beauty",       label: "Beauty & Personal Care" },
  { value: "health",       label: "Health & Wellness" },
  { value: "retail",       label: "Retail & Shopping" },
  { value: "professional", label: "Professional Services" },
  { value: "creative",     label: "Creative Arts" },
  { value: "home",         label: "Home Services" },
  { value: "education",    label: "Education & Coaching" },
  { value: "events",       label: "Events & Entertainment" },
  { value: "finance",      label: "Finance & Insurance" },
  { value: "technology",   label: "Technology" },
  { value: "nonprofit",    label: "Nonprofit & Community" },
  { value: "other",        label: "Other" },
];

const businessTypes = [
  { value: "brick_and_mortar", label: "Brick & Mortar" },
  { value: "service_based", label: "Service-Based / Mobile" },
  { value: "online_only", label: "Online Only" },
];

type QuickSettings = { category: string; verified: boolean };

// ─── Hours helpers ───────────────────────────────────────────────────────────

const DAY_KEYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
  friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function makeDefaultHours(): HoursState {
  return {
    monday:    { open: "09:00", close: "17:00", closed: false },
    tuesday:   { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday:  { open: "09:00", close: "17:00", closed: false },
    friday:    { open: "09:00", close: "17:00", closed: false },
    saturday:  { open: "10:00", close: "14:00", closed: false },
    sunday:    { open: null,    close: null,     closed: true  },
  };
}

function HoursEditor({ hours, onChange }: { hours: HoursState; onChange: (h: HoursState) => void }) {
  const update = (day: string, patch: Partial<DayHours>) => {
    onChange({ ...hours, [day]: { ...hours[day], ...patch } });
  };
  return (
    <div className="space-y-2">
      {DAY_KEYS.map((day) => {
        const dh = hours[day] ?? { open: "09:00", close: "17:00", closed: false };
        return (
          <div key={day} className="flex items-center gap-2 flex-wrap">
            <span className="w-24 text-[11px] font-semibold text-slate-600">{DAY_LABELS[day]}</span>
            <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={dh.closed}
                onChange={(e) => update(day, { closed: e.target.checked, open: e.target.checked ? null : (dh.open ?? "09:00"), close: e.target.checked ? null : (dh.close ?? "17:00") })}
                className="h-3.5 w-3.5 accent-purple-600"
              />
              Closed
            </label>
            {!dh.closed && (
              <>
                <input
                  type="time"
                  value={dh.open ?? ""}
                  onChange={(e) => update(day, { open: e.target.value || null })}
                  className="rounded-xl border border-slate-200 bg-white/70 px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-300"
                />
                <span className="text-[11px] text-slate-400">–</span>
                <input
                  type="time"
                  value={dh.close ?? ""}
                  onChange={(e) => update(day, { close: e.target.value || null })}
                  className="rounded-xl border border-slate-200 bg-white/70 px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-300"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Google Places Enrichment ─────────────────────────────────────────────────

type PlacesResult = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: HoursState | null;
};

function PlacesEnrichButton({
  businessName,
  city,
  onEnrich,
}: {
  businessName: string;
  city: string;
  onEnrich: (result: PlacesResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlacesResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const search = async () => {
    if (!businessName.trim()) { setMessage("Enter a business name first."); return; }
    setLoading(true);
    setResults(null);
    setMessage(null);
    try {
      const res = await fetch("/api/places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), city: city || "Jacksonville" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Places API error (HTTP ${res.status}).`);
      const places: PlacesResult[] = data.places ?? [];
      if (!places.length) { setMessage("No match found — fill in manually."); return; }
      if (places.length === 1) {
        onEnrich(places[0]);
        setMessage("✓ Pre-filled from Google Places. Review and adjust as needed.");
      } else {
        setResults(places);
      }
    } catch (err: any) {
      setMessage(err?.message || "Error reaching Google Places.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-purple-300 bg-purple-50 px-4 py-2 text-[12px] font-semibold text-purple-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching Places…" : "Auto-fill from Google Places"}
        </button>
        <span className="text-[10px] text-slate-400">~$0.02 per lookup</span>
      </div>
      {message && (
        <p className={`text-[11px] ${
          message.startsWith("✓") ? "text-emerald-600" :
          message.startsWith("No match") ? "text-slate-500" :
          "text-red-600"
        }`}>{message}</p>
      )}
      {results && results.length > 1 && (
        <div className="rounded-[18px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Multiple results — select the correct one
          </p>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onEnrich(r); setResults(null); setMessage("✓ Pre-filled from Google Places. Review and adjust as needed."); }}
              className="w-full border-t border-slate-100 px-4 py-3 text-left text-[12px] text-slate-700 transition hover:bg-purple-50 first:border-t-0"
            >
              <span className="font-semibold">{r.name}</span>
              <span className="ml-2 text-slate-400">{r.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mailto helpers ───────────────────────────────────────────────────────────

const SITE_URL = "https://vanta-jax.vercel.app";

function buildClaimApprovedMailto(ownerEmail: string, bizName: string, bizId: string, notes?: string): string {
  const listingUrl = `${SITE_URL}/business/${bizId}`;
  const dashboardUrl = `${SITE_URL}/dashboard`;
  const subject = `You're approved — ${bizName} is yours to manage`;
  const body = [
    `Hey ${bizName} team,`,
    ``,
    `Great news — your claim is approved. You now have full control of your Vanta listing.`,
    ``,
    `Your listing is live here: ${listingUrl}`,
    ``,
    `Log in to your dashboard to update your info, add a logo, and see how many people are finding you:`,
    `${dashboardUrl}`,
    ...(notes ? [``, `Note: ${notes}`] : []),
    ``,
    `— Gavin Marts`,
    `Founder, Vanta`,
    `vantajacksonville@gmail.com`,
  ].join("\n");
  return `mailto:${ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildClaimRejectedMailto(ownerEmail: string, bizName: string, notes?: string): string {
  const subject = `Update on your Vanta claim — ${bizName}`;
  const body = [
    `Hey ${bizName} team,`,
    ``,
    `Thanks for reaching out. We weren't able to approve your claim at this time.`,
    ...(notes ? [``, `Reason: ${notes}`] : [``, `If you have questions or think this was an error, just reply to this email.`]),
    ``,
    `— Gavin Marts`,
    `Founder, Vanta`,
    `vantajacksonville@gmail.com`,
  ].join("\n");
  return `mailto:${ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function DraftEmailButton({
  name, id, adminKey = "",
  onTracked,
}: {
  name: string;
  id: string;
  adminKey?: string;
  onTracked?: (count: number, sentAt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPanelPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleSend = async () => {
    if (!to.trim() || !firstName.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/send-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ businessId: id, to: to.trim(), firstName: firstName.trim(), businessName: name, customNote: customNote.trim() || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("sent");
        if (onTracked) onTracked(data.outreach_count, data.outreach_sent_at);
      } else {
        setStatus("error");
        setErrorMsg(data.error ?? "Failed to send.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error.");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStatus("idle");
    setErrorMsg("");
  };

  const panel = (
    <div
      ref={panelRef}
      style={{ position: "absolute", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
      className="w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-800">Outreach email — {name}</span>
        <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
      </div>

      {status === "sent" ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 text-[12px] text-emerald-700 font-medium">
          Sent to {to} ✓
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">To (email)</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="owner@example.com"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jordan"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Custom note <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. I found you through Google Maps and love what you're doing."
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none"
            />
          </div>
          {status === "error" && (
            <p className="text-[11px] text-red-600">{errorMsg}</p>
          )}
          <button
            type="button"
            disabled={!to.trim() || !firstName.trim() || status === "sending"}
            onClick={handleSend}
            className="mt-0.5 w-full rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending…" : "Send via Resend"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Send outreach email
      </button>
      {open && typeof document !== "undefined" && createPortal(panel, document.body)}
    </>
  );
}

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
  // Phase 6 — controlled fields + enrichment
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(suggestion.website ?? "");
  const [description, setDescription] = useState(suggestion.notes ?? "");
  const [hours, setHours] = useState<HoursState | null>(null);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  // Business name for Places enrichment (tracks form input)
  const [nameValue, setNameValue] = useState(suggestion.name ?? "");

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

  const handleEnrich = (result: PlacesResult) => {
    if (result.address) {
      // Split formatted address into street vs city/state/zip
      const parts = result.address.split(",").map((s) => s.trim());
      setAddress(parts[0] ?? "");
      if (parts[1]) setCity(parts[1]);
      if (parts[2]) setState(parts[2].replace(/\s*\d{5}.*$/, "").trim());
      const zipMatch = result.address.match(/\b(\d{5})\b/);
      if (zipMatch) setZip(zipMatch[1]);
    }
    if (result.latitude != null) setLat(result.latitude);
    if (result.longitude != null) setLng(result.longitude);
    if (result.phone) setPhone(result.phone);
    if (result.website) setWebsite(result.website);
    if (result.description) setDescription(result.description);
    if (result.hours) { setHours(result.hours); }
    setCoordsFilled(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, any> = {
      suggestionId: suggestion.id,
      name: (fd.get("name") as string)?.trim(),
      category: (fd.get("category") as string) || "professional",
      business_type: businessType || null,
      is_address_public: isAddressPublic,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip: zip.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      logo_url: (fd.get("logo_url") as string)?.trim() || null,
      description: description.trim() || null,
      service_area: (fd.get("service_area") as string)?.trim() || null,
      public_location_label:
        (fd.get("public_location_label") as string)?.trim() || null,
      verified: fd.get("verified") === "on",
      woman_owned: fd.get("woman_owned") === "on",
      instagram_url: instagramUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
    };

    if (lat !== null) payload.latitude = lat;
    if (lng !== null) payload.longitude = lng;
    if (hours !== null) payload.hours = hours;

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
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
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

      {/* Google Places enrichment */}
      <PlacesEnrichButton
        businessName={nameValue}
        city={city || suggestion.city || "Jacksonville"}
        onEnrich={handleEnrich}
      />

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
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 904-555-1234"
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Website
          </label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Short description for the directory listing"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* Social media */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Social links <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram URL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12px] text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
          <input type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="Facebook URL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12px] text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
          <input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="TikTok URL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12px] text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      </div>

      {/* Hours of operation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Hours of operation <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span>
          </label>
          {!hours && (
            <button type="button" onClick={() => setHours(makeDefaultHours())} className="text-[11px] font-semibold text-purple-600 hover:text-purple-800">
              + Add hours
            </button>
          )}
          {hours && (
            <button type="button" onClick={() => setHours(null)} className="text-[11px] text-slate-400 hover:text-slate-600">
              Remove
            </button>
          )}
        </div>
        {hours && <HoursEditor hours={hours} onChange={setHours} />}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex flex-wrap items-center gap-3">
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
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 shadow-sm backdrop-blur">
            <input
              type="checkbox"
              name="woman_owned"
              className="h-4 w-4 accent-pink-500"
            />
            <span className="text-[12px] text-slate-700">Woman-Owned</span>
          </label>
        </div>

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
  // Phase 6
  const [phone, setPhone] = useState(business.phone ?? "");
  const [website, setWebsite] = useState(business.website ?? "");
  const [description, setDescription] = useState(business.description ?? "");
  const [hours, setHours] = useState<HoursState | null>(business.hours ?? null);
  const [instagramUrl, setInstagramUrl] = useState(business.instagram_url ?? "");
  const [facebookUrl, setFacebookUrl] = useState(business.facebook_url ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(business.tiktok_url ?? "");
  const [nameValue, setNameValue] = useState(business.name ?? "");

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

  const handleEnrich = (result: PlacesResult) => {
    if (result.address) {
      const parts = result.address.split(",").map((s) => s.trim());
      setAddress(parts[0] ?? "");
      if (parts[1]) setCity(parts[1]);
      if (parts[2]) setStateVal(parts[2].replace(/\s*\d{5}.*$/, "").trim());
      const zipMatch = result.address.match(/\b(\d{5})\b/);
      if (zipMatch) setZip(zipMatch[1]);
    }
    if (result.latitude != null) setLat(result.latitude);
    if (result.longitude != null) setLng(result.longitude);
    if (result.phone) setPhone(result.phone);
    if (result.website) setWebsite(result.website);
    if (result.description) setDescription(result.description);
    if (result.hours) setHours(result.hours);
    setCoordsFilled(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, any> = {
      businessId: business.id,
      name: nameValue.trim(),
      category: (fd.get("category") as string) || "professional",
      business_type: businessType || null,
      is_address_public: isAddressPublic,
      address: address.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      zip: zip.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      logo_url: (fd.get("logo_url") as string)?.trim() || null,
      description: description.trim() || null,
      service_area: (fd.get("service_area") as string)?.trim() || null,
      public_location_label: (fd.get("public_location_label") as string)?.trim() || null,
      verified: fd.get("verified") === "on",
      featured: fd.get("featured") === "on",
      woman_owned: fd.get("woman_owned") === "on",
      instagram_url: instagramUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      hours: hours,
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
          <input value={nameValue} onChange={(e) => setNameValue(e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Category</label>
          <select name="category" defaultValue={business.category ?? "professional"} className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200">
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Google Places enrichment */}
      <PlacesEnrichButton
        businessName={nameValue}
        city={city || business.city || "Jacksonville"}
        onEnrich={handleEnrich}
      />

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
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 904-555-1234" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Website</label>
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
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
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short description for the directory listing" className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>

      {/* Social media */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Social links <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram URL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12px] text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
          <input type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="Facebook URL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12px] text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
          <input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="TikTok URL" className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12px] text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      </div>

      {/* Hours of operation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Hours of operation <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span>
          </label>
          {!hours && (
            <button type="button" onClick={() => setHours(makeDefaultHours())} className="text-[11px] font-semibold text-purple-600 hover:text-purple-800">
              + Add hours
            </button>
          )}
          {hours && (
            <button type="button" onClick={() => setHours(null)} className="text-[11px] text-slate-400 hover:text-slate-600">
              Remove
            </button>
          )}
        </div>
        {hours && <HoursEditor hours={hours} onChange={setHours} />}
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
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 shadow-sm backdrop-blur">
            <input type="checkbox" name="woman_owned" defaultChecked={business.woman_owned ?? false} className="h-4 w-4 accent-pink-500" />
            <span className="text-[12px] text-slate-700">Woman-Owned{business.woman_owned_requested && !business.woman_owned ? " ★ requested" : ""}</span>
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

type QuickFilter = "all" | "not_contacted" | "awaiting_response" | "claim_pending" | "claimed" | "archived";
type SortKey = "last_contacted" | "name" | "claim_status";

const QUICK_FILTER_OPTIONS: { key: QuickFilter; label: string }[] = [
  { key: "not_contacted", label: "Not contacted" },
  { key: "awaiting_response", label: "Awaiting response" },
  { key: "claim_pending", label: "Claim pending" },
  { key: "claimed", label: "Claimed" },
  { key: "all", label: "All live" },
  { key: "archived", label: "Archived" },
];

function OutreachStatusLine({ b }: { b: LiveBusiness }) {
  const count = b.outreach_count ?? 0;
  if (count === 0) return <span className="text-amber-600">Never contacted</span>;
  const dateStr = b.outreach_sent_at
    ? new Date(b.outreach_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  return <span className="text-slate-500">Contacted {dateStr} ({count}x)</span>;
}

function ClaimStatusLine({ b, pendingIds }: { b: LiveBusiness; pendingIds: Set<string> }) {
  if (b.is_claimed) return <span className="text-emerald-600">Claimed ✓</span>;
  if (pendingIds.has(b.id)) return <span className="text-blue-600">Claim pending review</span>;
  if ((b.outreach_count ?? 0) > 0) return <span className="text-slate-500">Unclaimed — outreach sent</span>;
  return <span className="text-amber-600">Unclaimed — no outreach</span>;
}

function LiveListings({
  businesses,
  mapboxToken,
  adminKey = "",
  claims = [],
}: {
  businesses: LiveBusiness[];
  mapboxToken?: string;
  adminKey?: string;
  claims?: Claim[];
}) {
  const [items, setItems] = useState<LiveBusiness[]>(businesses ?? []);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("not_contacted");
  const [sortKey, setSortKey] = useState<SortKey>("last_contacted");

  const pendingClaimIds = useMemo(
    () => new Set(claims.filter((c) => c.status === "pending").map((c) => c.business_id)),
    [claims]
  );

  const liveItems = items.filter((b) => !b.is_archived);
  const archivedItems = items.filter((b) => b.is_archived);

  // Summary counts (always computed from liveItems)
  const claimedCount = liveItems.filter((b) => b.is_claimed).length;
  const notContactedCount = liveItems.filter((b) => !(b.outreach_count ?? 0) && !b.is_claimed).length;
  const claimPendingCount = liveItems.filter((b) => pendingClaimIds.has(b.id)).length;

  // Base pool from quick filter
  const pool = useMemo(() => {
    if (quickFilter === "archived") return archivedItems;
    switch (quickFilter) {
      case "not_contacted":
        return liveItems.filter((b) => !(b.outreach_count ?? 0) && !b.is_claimed);
      case "awaiting_response":
        return liveItems.filter((b) => (b.outreach_count ?? 0) > 0 && !b.is_claimed && !pendingClaimIds.has(b.id));
      case "claim_pending":
        return liveItems.filter((b) => pendingClaimIds.has(b.id));
      case "claimed":
        return liveItems.filter((b) => b.is_claimed);
      default:
        return liveItems;
    }
  }, [quickFilter, items, pendingClaimIds]);

  // Text search
  const normalized = filter.trim().toLowerCase();
  const searched = normalized
    ? pool.filter((b) => [b.name, b.city ?? "", b.category ?? ""].join(" ").toLowerCase().includes(normalized))
    : pool;

  // Sort
  const sorted = useMemo(() => {
    const arr = [...searched];
    if (sortKey === "name") return arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "claim_status") {
      const score = (b: LiveBusiness) => {
        if (b.is_claimed) return 3;
        if (pendingClaimIds.has(b.id)) return 2;
        if ((b.outreach_count ?? 0) > 0) return 1;
        return 0;
      };
      return arr.sort((a, b) => score(b) - score(a));
    }
    // last_contacted (default)
    return arr.sort((a, b) => {
      const da = a.outreach_sent_at ? new Date(a.outreach_sent_at).getTime() : 0;
      const db = b.outreach_sent_at ? new Date(b.outreach_sent_at).getTime() : 0;
      return db - da;
    });
  }, [searched, sortKey, pendingClaimIds]);

  const handleSaved = (updated: LiveBusiness) => {
    setItems((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setEditingId(null);
    setMessage(`"${updated.name}" updated successfully.`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleArchive = async (b: LiveBusiness) => {
    const confirmed = window.confirm(
      `Archive "${b.name}"? This will hide them from the public directory. You can restore them at any time.`
    );
    if (!confirmed) return;
    setArchivingId(b.id);
    try {
      const res = await fetch("/api/admin/archive-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ businessId: b.id, action: "archive" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to archive.");
      setItems((prev) => prev.map((x) => x.id === b.id ? { ...x, is_archived: true, archived_at: new Date().toISOString() } : x));
      setEditingId(null);
      setMessage(`"${b.name}" archived. Find it under the Archived filter.`);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage(`Error: ${err?.message || "Could not archive."}`);
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestore = async (b: LiveBusiness) => {
    setArchivingId(b.id);
    try {
      const res = await fetch("/api/admin/archive-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ businessId: b.id, action: "restore" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to restore.");
      setItems((prev) => prev.map((x) => x.id === b.id ? { ...x, is_archived: false, archived_at: null } : x));
      setMessage(`"${b.name}" restored to the public directory.`);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(`Error: ${err?.message || "Could not restore."}`);
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary stats bar */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 shadow-sm backdrop-blur text-[11px]">
        <span className="text-slate-600"><span className="font-semibold text-slate-900">{liveItems.length}</span> live</span>
        <span className="text-slate-300 select-none">·</span>
        <span className="text-slate-600">
          <span className="font-semibold text-slate-900">{claimedCount}</span> claimed
          {liveItems.length > 0 && <span className="text-slate-400"> ({Math.round((claimedCount / liveItems.length) * 100)}%)</span>}
        </span>
        <span className="text-slate-300 select-none">·</span>
        <span className={notContactedCount > 0 ? "font-medium text-amber-700" : "text-slate-600"}>
          <span className="font-semibold">{notContactedCount}</span> not contacted
        </span>
        <span className="text-slate-300 select-none">·</span>
        <span className="text-slate-600"><span className="font-semibold text-slate-900">{claimPendingCount}</span> claim pending</span>
        <span className="text-slate-300 select-none">·</span>
        <span className="text-slate-600"><span className="font-semibold text-slate-900">{archivedItems.length}</span> archived</span>
      </div>

      {/* Quick filter bar */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTER_OPTIONS.map(({ key, label }) => {
          const isActive = quickFilter === key;
          const badge =
            key === "not_contacted" && notContactedCount > 0 && !isActive ? notContactedCount :
            key === "claim_pending" && claimPendingCount > 0 && !isActive ? claimPendingCount :
            key === "archived" && archivedItems.length > 0 && !isActive ? archivedItems.length :
            null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setQuickFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[12px] font-semibold transition ${
                isActive
                  ? key === "archived"
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              {label}
              {badge !== null && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${key === "claim_pending" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-900">{sorted.length}</span>
          {normalized ? ` / ${pool.length} visible` : " total"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] text-slate-700 shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="last_contacted">Sort: Last contacted</option>
            <option value="claim_status">Sort: Claim status</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, city, category…"
            className="w-full sm:w-[280px] rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl border px-4 py-3 text-[12px] ${message.startsWith("Error") ? "border-red-200 bg-red-50/80 text-red-700" : "border-emerald-200 bg-emerald-50/80 text-emerald-700"}`}>
          {message}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-900">
            {quickFilter === "archived" ? "No archived listings." : "No listings match this filter."}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {quickFilter === "archived"
              ? "Archived businesses will appear here and can be restored at any time."
              : "Try a different filter or search term."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((b) => {
          const isEditing = editingId === b.id;
          const isArchived = !!b.is_archived;
          return (
            <article
              key={b.id}
              className={`rounded-[28px] border backdrop-blur overflow-hidden shadow-[0_18px_48px_-40px_rgba(2,6,23,0.7)] ${
                isArchived
                  ? "border-amber-200/60 bg-amber-50/30 opacity-75"
                  : "border-slate-200/70 bg-white/70"
              }`}
            >
              <div className="px-5 sm:px-7 py-4 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{b.name}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      {b.category && (
                        <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm capitalize">{b.category}</span>
                      )}
                      <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 shadow-sm">{compactLocation(b.city, b.state)}</span>
                      {b.verified && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 shadow-sm">Verified</span>}
                      {b.featured && <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700 shadow-sm">Featured</span>}
                      {b.woman_owned && <span className="vj-badge-woman-owned shadow-sm">Woman-Owned</span>}
                      {b.woman_owned_requested && !b.woman_owned && <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-pink-600 shadow-sm">WO Requested</span>}
                      {isArchived && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 shadow-sm">Archived</span>}
                    </div>
                    {/* Outreach + claim status row */}
                    {!isArchived && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <OutreachStatusLine b={b} />
                        <span className="text-slate-300 select-none">·</span>
                        <ClaimStatusLine b={b} pendingIds={pendingClaimIds} />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-wrap items-center gap-2">
                    {!isArchived && (
                      <DraftEmailButton
                        name={b.name}
                        id={b.id}
                        adminKey={adminKey}
                        onTracked={(count, sentAt) => {
                          setItems((prev) =>
                            prev.map((x) => x.id === b.id ? { ...x, outreach_count: count, outreach_sent_at: sentAt } : x)
                          );
                        }}
                      />
                    )}
                    <a href={`/businesses/${b.id}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                      View →
                    </a>
                    {isArchived ? (
                      <button
                        type="button"
                        disabled={archivingId === b.id}
                        onClick={() => handleRestore(b)}
                        className="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {archivingId === b.id ? "Restoring…" : "Restore"}
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditingId(isEditing ? null : b.id)}
                          className={"rounded-2xl border px-3 py-2 text-[12px] font-semibold shadow-sm backdrop-blur transition hover:-translate-y-0.5 " + (isEditing ? "border-purple-300 bg-purple-50 text-purple-700" : "border-slate-200 bg-white/70 text-slate-800 hover:bg-white")}
                        >
                          {isEditing ? "Cancel" : "Edit"}
                        </button>
                        <button
                          type="button"
                          disabled={archivingId === b.id}
                          onClick={() => handleArchive(b)}
                          className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-semibold text-slate-400 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Archive this listing"
                        >
                          {archivingId === b.id ? "…" : "Archive"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && !isArchived && (
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

// ─── ClaimsTab ────────────────────────────────────────────────────────────────

function ClaimsTab({ claims, adminKey }: { claims: Claim[]; adminKey: string }) {
  const [localClaims, setLocalClaims] = useState<Claim[]>(claims);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({});

  const pending = localClaims.filter((c) => c.status === "pending");
  const reviewed = localClaims.filter((c) => c.status !== "pending");

  const setMsg = (id: string, text: string, ok: boolean) =>
    setMessages((prev) => ({ ...prev, [id]: { text, ok } }));

  const handle = async (claimId: string, action: "approve" | "reject") => {
    setLoadingId(claimId);
    try {
      const res = await fetch(`/api/admin/${action}-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ claimId, notes: notes[claimId] || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(claimId, data?.error || "Error.", false);
      } else {
        setMsg(claimId, action === "approve" ? "Approved!" : "Rejected.", true);
        setLocalClaims((prev) =>
          prev.map((c) =>
            c.id === claimId
              ? { ...c, status: action === "approve" ? "approved" : "rejected", approved_at: action === "approve" ? new Date().toISOString() : null }
              : c
          )
        );
      }
    } catch {
      setMsg(claimId, "Network error.", false);
    } finally {
      setLoadingId(null);
    }
  };

  if (!localClaims.length) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-sm backdrop-blur">
        <p className="text-sm font-semibold text-slate-900">No claims yet.</p>
        <p className="mt-1 text-[11px] text-slate-500">When business owners claim their listings, they'll appear here.</p>
      </div>
    );
  }

  const renderClaim = (claim: Claim) => {
    const msg = messages[claim.id];
    const isPending = claim.status === "pending";
    return (
      <div
        key={claim.id}
        className={`rounded-3xl border px-5 py-5 shadow-sm backdrop-blur ${
          isPending
            ? "border-purple-200/80 bg-purple-50/40"
            : claim.status === "approved"
              ? "border-emerald-200/70 bg-emerald-50/30"
              : "border-red-200/70 bg-red-50/30"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[13px] font-semibold text-slate-900">
              {claim.businesses?.name ?? "Unknown business"}
            </p>
            <p className="text-[11px] text-slate-600">
              <span className="font-medium">{claim.profiles?.email ?? "Unknown email"}</span>
              {claim.profiles?.full_name ? ` · ${claim.profiles.full_name}` : ""}
            </p>
            <p className="text-[10px] text-slate-400">
              Via {claim.verification_method ?? "email"} · {new Date(claim.claimed_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            claim.status === "pending" ? "bg-purple-100 text-purple-700" :
            claim.status === "approved" ? "bg-emerald-100 text-emerald-700" :
            "bg-red-100 text-red-700"
          }`}>
            {claim.status}
          </span>
        </div>

        {msg && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className={`text-[11px] font-medium ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>
              {msg.text}
            </p>
            {msg.ok && claim.profiles?.email && claim.businesses?.name && (
              <a
                href={
                  claim.status === "approved" || messages[claim.id]?.text === "Approved!"
                    ? buildClaimApprovedMailto(claim.profiles.email, claim.businesses.name, claim.business_id, notes[claim.id])
                    : buildClaimRejectedMailto(claim.profiles.email, claim.businesses.name, notes[claim.id])
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Send notification email →
              </a>
            )}
          </div>
        )}

        {isPending && !msg?.ok && (
          <div className="mt-4 space-y-3">
            <textarea
              placeholder="Admin notes (optional) — included in the notification email"
              value={notes[claim.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [claim.id]: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-300 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loadingId === claim.id}
                onClick={() => handle(claim.id, "approve")}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingId === claim.id ? "…" : "Approve"}
              </button>
              <button
                type="button"
                disabled={loadingId === claim.id}
                onClick={() => handle(claim.id, "reject")}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingId === claim.id ? "…" : "Reject"}
              </button>
              <a
                href={`/businesses/${claim.business_id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
              >
                View listing ↗
              </a>
            </div>
          </div>
        )}

        {/* Already-reviewed: show a quick email link if owner email is available */}
        {!isPending && !msg && claim.profiles?.email && claim.businesses?.name && (
          <div className="mt-3">
            <a
              href={
                claim.status === "approved"
                  ? buildClaimApprovedMailto(claim.profiles.email, claim.businesses.name, claim.business_id)
                  : buildClaimRejectedMailto(claim.profiles.email, claim.businesses.name)
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 underline underline-offset-2 hover:text-slate-700 transition"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Email owner
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Pending · {pending.length}
          </p>
          {pending.map(renderClaim)}
        </>
      )}
      {reviewed.length > 0 && (
        <>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Reviewed · {reviewed.length}
          </p>
          {reviewed.map(renderClaim)}
        </>
      )}
    </div>
  );
}

// ─── AdminDashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard({ suggestions, businesses, mapboxToken, claims = [], adminKey = "" }: Props) {
  const [activeTab, setActiveTab] = useState<"suggestions" | "live" | "claims">("suggestions");
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
        category: category || "professional",
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
        const qs = quickSettings[selectedId] ?? { category: "professional", verified: true };
        const ok = window.confirm(`Quick promote "${s.name}" as "${qs.category}"?`);
        if (!ok) return;
        handlePromoteQuick(s, qs.category, qs.verified);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, selectedId, openIds, editIds, quickSettings]);

  const pendingClaimsCount = claims.filter((c) => c.status === "pending").length;

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
      <button
        type="button"
        onClick={() => setActiveTab("claims")}
        className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition ${activeTab === "claims" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
      >
        Claims{" "}
        {pendingClaimsCount > 0 && (
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "claims" ? "bg-purple-400/30 text-white" : "bg-purple-100 text-purple-700"}`}>
            {pendingClaimsCount}
          </span>
        )}
      </button>
    </div>
  );

  if (!totalCount && activeTab === "suggestions") {
    return (
      <div className="space-y-5">
        {tabBar}
        {activeTab === "suggestions" && (
          <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-[0_16px_40px_-34px_rgba(2,6,23,0.7)] backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">No suggestions waiting for review.</p>
            <p className="mt-2 text-[11px] text-slate-600">When supporters submit new businesses, they will appear here.</p>
          </div>
        )}
        {activeTab === "live" && (
          <LiveListings businesses={businesses ?? []} mapboxToken={mapboxToken} adminKey={adminKey} claims={claims} />
        )}
        {activeTab === "claims" && (
          <ClaimsTab claims={claims} adminKey={adminKey} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {tabBar}
      {activeTab === "live" && (
        <LiveListings businesses={businesses ?? []} mapboxToken={mapboxToken} adminKey={adminKey} claims={claims} />
      )}
      {activeTab === "claims" && (
        <ClaimsTab claims={claims} adminKey={adminKey} />
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
          const qs = quickSettings[s.id] ?? { category: "professional", verified: true };

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
                        {s.promoted_to_business_id && (
                          <DraftEmailButton name={s.name} id={s.promoted_to_business_id} adminKey={adminKey} />
                        )}
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
