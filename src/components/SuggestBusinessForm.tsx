import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function SuggestBusinessForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // 🪤 Honeypot: bots will often fill this; humans won't see it.
    const honeypot = ((fd.get('company') as string) || '').trim();
    if (honeypot.length > 0) {
      // silently pretend it worked, but do nothing
      setMessage('Thank you! Your suggestion was submitted.');
      setLoading(false);
      form.reset();
      return;
    }

    const name = ((fd.get('name') as string) || '').trim();
    const city = ((fd.get('city') as string) || '').trim();
    const state = ((fd.get('state') as string) || 'FL').trim().toUpperCase();
    const website = ((fd.get('website') as string) || '').trim() || null;
    const notes = ((fd.get('notes') as string) || '').trim() || null;

    if (!name || !city) {
      setError('Please provide at least a business name and city.');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('business_suggestions')
        .insert({
          name,
          city,
          state,
          website,
          notes,
        });

      if (insertError) {
        console.error(insertError);
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setMessage('Thank you! Your suggestion was submitted.');
      form.reset();
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-50">
        Suggest a Black-owned business
      </h2>
      <p className="text-[11px] text-slate-400">
        Know a spot that should be on the radar? Drop it here and we’ll review it.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-purple-900/60 bg-black/70 p-4 sm:p-5 shadow-[0_0_25px_rgba(76,29,149,0.6)]"
      >
        {/* Honeypot field (hidden from humans) */}
        <div className="hidden">
          <label>
            Company
            <input
              type="text"
              name="company"
              autoComplete="off"
              tabIndex={-1}
            />
          </label>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Business name *
          </label>
          <input
            name="name"
            maxLength={120}
            required
            className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            placeholder="e.g. Soul Food Bistro"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              City *
            </label>
            <input
              name="city"
              maxLength={80}
              required
              className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
              placeholder="e.g. Jacksonville"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              State
            </label>
            <input
              name="state"
              defaultValue="FL"
              maxLength={2}
              className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs uppercase text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Website or social link
          </label>
          <input
            name="website"
            maxLength={255}
            className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            placeholder="https:// or @handle"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Any notes
          </label>
          <textarea
            name="notes"
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            placeholder="What do you love about this place?"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/50 bg-red-950/50 px-3 py-1.5 text-[11px] text-red-100">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-[11px] text-emerald-100">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-purple-500 px-4 py-1.5 text-[11px] font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.8)] hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit suggestion'}
        </button>
      </form>
    </section>
  );
}
