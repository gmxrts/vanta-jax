import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type Suggestion = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
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

export default function AdminDashboard({ suggestions }: Props) {
  const [items, setItems] = useState<Suggestion[]>(suggestions || []);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const handlePromote = async (
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
      const res = await fetch("/api/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setGlobalError(data?.error || "Failed to promote suggestion.");
        return;
      }

      setItems((prev) => prev.filter((s) => s.id !== suggestionId));
      setGlobalMessage("Suggestion promoted successfully.");
      form.reset();
    } catch (err) {
      console.error(err);
      setGlobalError("Unexpected error promoting suggestion.");
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

      if (!res.ok) {
        setGlobalError(data?.error || "Failed to reject suggestion.");
        return;
      }

      setItems((prev) => prev.filter((s) => s.id !== suggestionId));
      setGlobalMessage("Suggestion rejected and removed.");
    } catch (err) {
      console.error(err);
      setGlobalError("Unexpected error rejecting suggestion.");
    } finally {
      setRejectingId(null);
    }
  };

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedFilter) return items;

    return items.filter((s) => {
      const haystack = [s.name, s.city ?? "", s.state ?? "", s.notes ?? "", s.website ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedFilter);
    });
  }, [items, normalizedFilter]);

  const totalCount = items.length;
  const visibleCount = filteredItems.length;

  if (!totalCount) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-5 py-5 shadow-[0_16px_40px_-34px_rgba(2,6,23,0.7)] backdrop-blur">
        <p className="text-sm font-semibold text-slate-900">No suggestions waiting for review.</p>
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
          {normalizedFilter && (
            <span className="text-slate-500"> (filtered by “{filter}”)</span>
          )}
        </div>

        <div className="w-full sm:w-auto">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, city, notes…"
            className="w-full sm:w-[320px] rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
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

      {/* Suggestion cards */}
      <div className="space-y-5">
        {filteredItems.map((s) => (
          <article
            key={s.id}
            className="rounded-[28px] border border-slate-200/70 bg-white/70 p-5 sm:p-7 shadow-[0_18px_48px_-40px_rgba(2,6,23,0.7)] backdrop-blur"
          >
            <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Submission
                </p>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                  {s.name}
                </h2>
                <p className="text-[11px] text-slate-600">
                  Suggested {new Date(s.created_at).toLocaleString()}
                </p>
              </div>

              <div className="text-[11px] text-slate-600">
                {s.city || s.state ? (
                  <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur">
                    {s.city && <>{s.city}, </>}
                    {s.state}
                  </span>
                ) : (
                  <span className="italic text-slate-400">
                    Location not provided
                  </span>
                )}
              </div>
            </header>

            <form
              onSubmit={(e) => handlePromote(e, s.id)}
              className="space-y-4"
            >
              {/* Top row */}
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
                    defaultValue="services"
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

              {/* Address row */}
              <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Street address
                  </label>
                  <input
                    name="address"
                    placeholder="Street address"
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
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-3 text-sm text-slate-900 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>
              </div>

              {/* Phone + Website */}
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

              {/* Description */}
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
                    defaultChecked
                    className="h-4 w-4 accent-purple-600"
                  />
                  <span className="text-[12px] text-slate-700">
                    Mark as verified Black-owned
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReject(s.id)}
                    disabled={rejectingId === s.id}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2 text-[12px] font-semibold text-red-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rejectingId === s.id ? "Rejecting…" : "Reject"}
                  </button>

                  <button
                    type="submit"
                    disabled={promotingId === s.id}
                    className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_16px_34px_-22px_rgba(147,51,234,0.65)] transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {promotingId === s.id ? "Promoting…" : "Promote to directory"}
                  </button>
                </div>
              </div>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
