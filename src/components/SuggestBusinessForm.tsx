import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

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
    const honeypot = ((fd.get("company") as string) || "").trim();
    if (honeypot.length > 0) {
      setMessage("Thank you! Your suggestion was submitted.");
      setLoading(false);
      form.reset();
      return;
    }

    const name = ((fd.get("name") as string) || "").trim();
    const city = ((fd.get("city") as string) || "").trim();
    const state = (((fd.get("state") as string) || "FL").trim().toUpperCase() || "FL").slice(0, 2);
    const website = ((fd.get("website") as string) || "").trim() || null;
    const notes = ((fd.get("notes") as string) || "").trim() || null;

    if (!name || !city) {
      setError("Business name and city are required.");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("business_suggestions").insert({
        name,
        city,
        state,
        website,
        notes,
      });

      if (insertError) {
        console.error(insertError);
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setMessage("Thank you! Your suggestion was submitted.");
      form.reset();
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Suggestion details</h2>
        <p className="mt-2 text-[12px] text-slate-600 leading-relaxed">
          A few details go a long way. If you only know the name + city, submit that — we’ll do the rest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot field (hidden from humans) */}
        <div className="hidden">
          <label>
            Company
            <input type="text" name="company" autoComplete="off" tabIndex={-1} />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Business name <span className="text-purple-600">*</span>
          </label>
          <input
            name="name"
            maxLength={120}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="e.g. Soul Food Bistro"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              City <span className="text-purple-600">*</span>
            </label>
            <input
              name="city"
              maxLength={80}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="e.g. Jacksonville"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              State
            </label>
            <input
              name="state"
              defaultValue="FL"
              maxLength={2}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Website or social media handle
          </label>
          <input
            name="website"
            maxLength={200}
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="https://…, Instagram, etc."
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Notes
          </label>
          <textarea
            name="notes"
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="Why this spot belongs on the radar, best days to go, what they’re known for…"
          />
          <p className="text-[11px] text-slate-500">
            Basic details are enough. We’ll handle the rest during verification.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-[12px] text-emerald-700">
            {message}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-22px_rgba(147,51,234,0.65)] transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit suggestion"}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-500">
            By submitting, you’re helping build a directory people can trust.
          </p>
        </div>
      </form>
    </section>
  );
}
