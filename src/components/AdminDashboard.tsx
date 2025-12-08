import { useState } from 'react';
import type { FormEvent } from 'react';

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
  { value: 'food', label: 'Food & Dining' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'health', label: 'Health' },
  { value: 'nonprofit', label: 'Nonprofit' },
];

export default function AdminDashboard({ suggestions }: Props) {
  const [items, setItems] = useState<Suggestion[]>(suggestions || []);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const handlePromote = async (e: FormEvent<HTMLFormElement>, suggestionId: string) => {
    e.preventDefault();
    setGlobalError(null);
    setGlobalMessage(null);
    setPromotingId(suggestionId);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      suggestionId,
      name: (fd.get('name') as string)?.trim(),
      category: (fd.get('category') as string) || 'services',
      address: (fd.get('address') as string)?.trim() || null,
      city: (fd.get('city') as string)?.trim() || null,
      state: (fd.get('state') as string)?.trim() || null,
      zip: (fd.get('zip') as string)?.trim() || null,
      phone: (fd.get('phone') as string)?.trim() || null,
      website: (fd.get('website') as string)?.trim() || null,
      description: (fd.get('description') as string)?.trim() || null,
      verified: fd.get('verified') === 'on',
    };

    if (!payload.name) {
      setGlobalError('Name is required.');
      setPromotingId(null);
      return;
    }

    try {
      const res = await fetch('/api/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setGlobalError(data?.error || 'Failed to promote suggestion.');
        return;
      }

      setItems((prev) => prev.filter((s) => s.id !== suggestionId));
      setGlobalMessage('Suggestion promoted successfully.');
      form.reset();
    } catch (err) {
      console.error(err);
      setGlobalError('Unexpected error promoting suggestion.');
    } finally {
      setPromotingId(null);
    }
  };

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-purple-900/40 bg-black/60 px-4 py-4 sm:px-5 sm:py-5 text-sm text-slate-200">
        <p>No suggestions waiting for review.</p>
        <p className="mt-1 text-[11px] text-slate-400">
          When supporters submit new businesses, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {globalError && (
        <p className="rounded-xl border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-100">
          {globalError}
        </p>
      )}
      {globalMessage && (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
          {globalMessage}
        </p>
      )}

      <div className="grid gap-4">
        {items.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-purple-900/50 bg-black/70 p-4 sm:p-5 shadow-[0_0_25px_rgba(76,29,149,0.6)]"
          >
            <header className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">{s.name}</h2>
                <p className="text-[11px] text-slate-400">
                  Suggested {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-[11px] text-slate-400">
                {s.city && s.state ? (
                  <span>
                    {s.city}, {s.state}
                  </span>
                ) : (
                  <span className="italic text-slate-500">Location not provided</span>
                )}
              </div>
            </header>

            <form
              onSubmit={(e) => handlePromote(e, s.id)}
              className="space-y-3 text-xs text-slate-100"
            >
              <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Business name *
                  </label>
                  <input
                    name="name"
                    defaultValue={s.name}
                    className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue="services"
                    className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70 [color-scheme:dark]"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value} className="bg-black text-slate-50">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Address
                  </label>
                  <input
                    name="address"
                    className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      City
                    </label>
                    <input
                      name="city"
                      defaultValue={s.city || ''}
                      className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-2 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      State
                    </label>
                    <input
                      name="state"
                      defaultValue={s.state || 'FL'}
                      maxLength={2}
                      className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-2 py-1.5 text-xs uppercase outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      ZIP
                    </label>
                    <input
                      name="zip"
                      className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-2 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Phone
                  </label>
                  <input
                    name="phone"
                    className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                    placeholder="e.g. 904-555-1234"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Website or social link
                  </label>
                  <input
                    name="website"
                    defaultValue={s.website || ''}
                    className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={s.notes || ''}
                  rows={3}
                  className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                  placeholder="Short description for the directory listing"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    name="verified"
                    defaultChecked
                    className="h-3 w-3 rounded border-purple-800 bg-black text-purple-500 focus:ring-purple-500/80"
                  />
                  <span>Mark as verified Black-owned</span>
                </label>

                <button
                  type="submit"
                  disabled={promotingId === s.id}
                  className="inline-flex items-center justify-center rounded-lg bg-purple-500 px-3 py-1.5 text-[11px] font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.8)] hover:brightness-110 disabled:opacity-60"
                >
                  {promotingId === s.id ? 'Promoting…' : 'Promote to directory'}
                </button>
              </div>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
