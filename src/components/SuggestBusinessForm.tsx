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
      setError('Business name and city are required.');
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
      <h2 className="text-sm font-semibold text-slate-900">
        Suggest a Black-owned business
      </h2>
      <p className="text-[11px] text-slate-600">
        Know a spot that should be on the radar? Drop it here and we’ll review it.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
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
          <label className="block text-[11px] font-medium text-slate-700">
            Business name *
          </label>
          <input
            name="name"
            maxLength={120}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="e.g. Soul Food Bistro"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              City *
            </label>
            <input
              name="city"
              maxLength={80}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="e.g. Jacksonville"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              State
            </label>
            <input
              name="state"
              defaultValue="FL"
              maxLength={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">
            Website or social link
          </label>
          <input
            name="website"
            maxLength={200}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="https://…, Instagram, etc."
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">
            Anything we should know?
          </label>
          <textarea
            name="notes"
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="Why this spot belongs on the radar, best days to go, etc."
          />
          <p className="text-[10px] text-slate-400">
            Basic details are enough. We’ll handle the rest during verification.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit suggestion'}
        </button>
      </form>
    </section>
  );
}
