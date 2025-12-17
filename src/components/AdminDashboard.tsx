import { useState } from "react";
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
        headers: {
          "Content-Type": "application/json",
        },
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
        headers: {
          "Content-Type": "application/json",
        },
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

  const filteredItems = !normalizedFilter
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

  const totalCount = items.length;
  const visibleCount = filteredItems.length;

  if (!totalCount) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5 sm:py-5 text-sm text-slate-800">
        <p>No suggestions waiting for review.</p>
        <p className="mt-1 text-[11px] text-slate-500">
          When supporters submit new businesses, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-900">
            {visibleCount} / {totalCount}
          </span>{" "}
          suggestions visible
          {normalizedFilter && (
            <span className="text-slate-500"> (filtered by “{filter}”)</span>
          )}
        </div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, city, notes…"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {globalError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {globalError}
        </p>
      )}
      {globalMessage && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          {globalMessage}
        </p>
      )}

      {/* suggestion cards */}
      <div className="space-y-4">
        {filteredItems.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
          >
            <header className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {s.name}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Suggested {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-[11px] text-slate-500">
                {s.city || s.state ? (
                  <span>
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
              className="space-y-3 text-xs text-slate-800"
            >
              {/* name + category */}
              <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Business name *
                  </label>
                  <input
                    name="name"
                    defaultValue={s.name}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue="services"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* address / city / state / zip */}
              <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Street address
                  </label>
                  <input
                    name="address"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">
                      City
                    </label>
                    <input
                      name="city"
                      defaultValue={s.city || ""}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">
                      State
                    </label>
                    <input
                      name="state"
                      defaultValue={s.state || "FL"}
                      maxLength={2}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs uppercase text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">
                      ZIP
                    </label>
                    <input
                      name="zip"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* phone + website */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    name="phone"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="e.g. 904-555-1234"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Website or social link
                  </label>
                  <input
                    name="website"
                    defaultValue={s.website || ""}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={s.notes || ""}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Short description for the directory listing"
                />
              </div>

              {/* footer actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    name="verified"
                    defaultChecked
                    className="h-3 w-3 rounded border-slate-400 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Mark as verified Black-owned</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReject(s.id)}
                    disabled={rejectingId === s.id}
                    className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rejectingId === s.id ? "Rejecting…" : "Reject"}
                  </button>

                  <button
                    type="submit"
                    disabled={promotingId === s.id}
                    className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
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
