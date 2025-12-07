import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function SuggestBusinessForm() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('FL');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const { error } = await supabase.from('business_suggestions').insert({
        name,
        city: city || null,
        state: state || null,
        website: website || null,
        notes: notes || null,
      });

      if (error) {
        console.error(error);
        setError('Something went wrong. Please try again.');
        return;
      }

      setMessage('Thank you! Your suggestion was submitted.');
      setName('');
      setCity('');
      setState('FL');
      setWebsite('');
      setNotes('');
    } catch (err) {
      console.error(err);
      setError('Unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-purple-900/40 bg-black/60 px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-sm font-semibold text-slate-50">
        Suggest a Black-owned business
      </h2>
      <p className="mt-1 text-[11px] text-slate-400">
        Know a spot that should be on the radar? Drop it here and we’ll review it.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Business name *
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            placeholder="Business name"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-[2fr,1fr]">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              City
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
              placeholder="e.g. Jacksonville"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              State
            </label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
              placeholder="FL"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Website or social link
          </label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            placeholder="https://..."
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Any notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
            placeholder="What do you love about this place?"
          />
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.8)] hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Submit suggestion'}
          </button>

          {message && (
            <p className="text-[11px] text-emerald-300">{message}</p>
          )}
          {error && (
            <p className="text-[11px] text-red-300">{error}</p>
          )}
        </div>
      </form>
    </section>
  );
}
