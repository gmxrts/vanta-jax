import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AddressAutofill } from "@mapbox/search-js-react";

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
};

const categories = [
  { value: "food", label: "Food & Dining" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health & Wellness" },
  { value: "nonprofit", label: "Nonprofit & Community" },
  { value: "other", label: "Other" },
];

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

  // Heuristics: tweak these keywords to match your real import patterns
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

type QuickSettings = { category: string; verified: boolean };

export default function AdminDashboard({ suggestions }: Props) {
  const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN as string | undefined;
  const [items, setItems] = useState<Suggestion[]>(suggestions ?? []);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [editIds, setEditIds] = useState<Set<string>>(() => new Set());

  const [filter, setFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  // Keyboard selection
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Quick settings per item (so "P" can promote without DOM lookups)
  const [quickSettings, setQuickSettings] = useState<Record<string, QuickSettings>>(
    () => ({})
  );

  // Refs for scrollIntoView
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
          const haystack = [
            s.name,
            s.city ?? "",
            s.state ?? "",
            s.notes ?? "",
            s.website ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedFilter);
        });

    return onlyOpen ? base.filter((s) => openIds.has(s.id)) : base;
  }, [items, normalizedFilter, onlyOpen, openIds]);

  // Ensure selectedId stays valid and defaults to first visible row
  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredItems.some((x) => x.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  // Scroll selection into view when it changes
  useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const totalCount = items.length;
  const visibleCount = filteredItems.length;

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEditIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setQuickSettings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      console.error(err);
      setGlobalError(err?.message || "Unexpected error promoting suggestion.");
    } finally {
      setPromotingId(null);
    }
  };

  const handlePromoteFull = async (
    e: FormEvent<HTMLFormElement>,
    suggestionId: string
  ) => {
    e.preventDefault();
    setGlobalError(null);
    setGlobalMessage(null);
    setPromotingId(suggestionId);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      suggestionId,
      name: (fd.get("name") as string)?.trim(),
      category: (fd.get("category") as string) || "services",
      address: (fd.get("address") as string)?.trim() || null,
      city: (fd.get("city") as string)?.trim() || null,
      state: (fd.get("state") as string)?.trim() || null,
      zip: (fd.get("zip") as string)?.trim() || null,
      phone: (fd.get("phone") as string)?.trim() || null,
      website: (fd.get("website") as string)?.trim() || null,
      description: (fd.get("description") as string)?.trim() || null,
      verified: fd.get("verified") === "on",
    };

    if (!payload.name) {
      setGlobalError("Name is required.");
      setPromotingId(null);
      return;
    }

    try {
      await postPromote(payload);
      removeItem(suggestionId);
      setGlobalMessage("Promoted successfully.");
      form.reset();
    } catch (err: any) {
      console.error(err);
      setGlobalError(err?.message || "Unexpected error promoting suggestion.");
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
      console.error(err);
      setGlobalError(err?.message || "Unexpected error rejecting suggestion.");
    } finally {
      setRejectingId(null);
    }
  };

  // Keyboard controls (ignore while typing in inputs)
  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!filteredItems.length) return;

      const key = e.key.toLowerCase();

      if (key === "j" || key === "k") {
        e.preventDefault();
        const idx = Math.max(
          0,
          filteredItems.findIndex((x) => x.id === selectedId)
        );
        const nextIdx =
          key === "j"
            ? Math.min(filteredItems.length - 1, idx + 1)
            : Math.max(0, idx - 1);

        setSelectedId(filteredItems[nextIdx].id);
        return;
      }

      if (key === "enter") {
        e.preventDefault();
        if (selectedId) toggleOpen(selectedId);
        return;
      }

      if (key === "e") {
        e.preventDefault();
        if (!selectedId) return;
        setEditOpen(selectedId, !editIds.has(selectedId));
        return;
      }

      if (key === "escape") {
        e.preventDefault();
        if (!selectedId) return;
        // close edit first, otherwise collapse
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
        const ok = window.confirm(
          `Quick promote "${s.name}" as "${qs.category}"?`
        );
        if (!ok) return;

        handlePromoteQuick(s, qs.category, qs.verified);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, selectedId, openIds, editIds, quickSettings]);

  if (!totalCount) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-[0_16px_40px_-34px_rgba(2,6,23,0.7)] backdrop-blur">
        <p className="text-sm font-semibold text-slate-900">
          No suggestions waiting for review.
        </p>
        <p className="mt-2 text-[11px] text-slate-600">
          When supporters submit new businesses, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
      <div className="space-y-4">
        {filteredItems.map((s) => {
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
              ref={(el) => {
                rowRefs.current[s.id] = el;
              }}
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
                  onClick={() => {
                    setSelectedId(s.id);
                    toggleOpen(s.id);
                  }}
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

                        {/* Status pill */}
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

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={
                          isOpen
                            ? "rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-semibold text-purple-700"
                            : "rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-[11px] font-semibold text-slate-700"
                        }
                      >
                        {isOpen ? "Open" : "Closed"}
                      </span>
                      <span className="text-slate-400 text-[12px]">
                        {isOpen ? "▾" : "▸"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Body */}
                {isOpen && (
                  <div className="px-5 sm:px-7 pb-6">
                    <div className="h-px w-full bg-slate-200/70 mb-5" />

                    {/* Quick actions */}
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
                                  await navigator.clipboard.writeText(
                                    safeUrl(s.website as string)
                                  );
                                  setGlobalMessage("Website link copied.");
                                  setGlobalError(null);
                                } catch {
                                  setGlobalError("Couldn’t copy link (blocked).");
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

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(s.id)}
                          disabled={rejectingId === s.id}
                          className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2 text-[12px] font-semibold text-red-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {rejectingId === s.id ? "Rejecting…" : "Reject"}
                        </button>
                      </div>
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
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
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

                        <form onSubmit={(e) => handlePromoteFull(e, s.id)} className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
                            <div className="space-y-2">
                              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Business name <span className="text-purple-600">*</span>
                              </label>
                              <input
                                name="name"
                                defaultValue={s.name}
                                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Category
                              </label>
                              <select
                                name="category"
                                defaultValue={qs.category}
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

                          {!MAPBOX_TOKEN && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] text-amber-800">
                              Address autocomplete is disabled (missing <span className="font-semibold">PUBLIC_MAPBOX_TOKEN</span>).
                            </div>
                          )}

                          <AddressAutofill
                            accessToken={MAPBOX_TOKEN || ""}
                            options={{ country: "us" }}
                          >
                            <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
                              <div className="space-y-2">
                                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  Street address
                                </label>
                                <input
                                  name="address"
                                  autoComplete="address-line1"
                                  placeholder="Start typing an address…"
                                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    City
                                  </label>
                                  <input
                                    name="city"
                                    autoComplete="address-level2"
                                    defaultValue={s.city || ""}
                                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    State
                                  </label>
                                  <input
                                    name="state"
                                    autoComplete="address-level1"
                                    defaultValue={s.state || "FL"}
                                    maxLength={2}
                                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-3 text-sm uppercase text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    ZIP
                                  </label>
                                  <input
                                    name="zip"
                                    autoComplete="postal-code"
                                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                                  />
                                </div>
                              </div>
                            </div>
                          </AddressAutofill>

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
                                defaultValue={s.website || ""}
                                placeholder="https://…"
                                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Description
                            </label>
                            <textarea
                              name="description"
                              defaultValue={s.notes || ""}
                              rows={3}
                              placeholder="Short description for the directory listing"
                              className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                            />
                          </div>

                          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 shadow-sm backdrop-blur">
                              <input
                                type="checkbox"
                                name="verified"
                                defaultChecked={qs.verified}
                                className="h-4 w-4 accent-purple-600"
                              />
                              <span className="text-[12px] text-slate-700">
                                Mark as verified Black-owned
                              </span>
                            </label>

                            <button
                              type="submit"
                              disabled={promotingId === s.id}
                              className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_16px_34px_-22px_rgba(147,51,234,0.65)] transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {promotingId === s.id ? "Promoting…" : "Promote (with edits)"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
