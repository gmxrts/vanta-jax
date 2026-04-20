import { useState } from "react";
import type { FormEvent } from "react";

type BusinessType = "brick_and_mortar" | "service_based" | "online_only" | "";

const TYPE_OPTIONS = [
  {
    value: "brick_and_mortar" as const,
    label: "Brick & Mortar",
    description: "Has a physical storefront or office customers visit",
    icon: "🏪",
  },
  {
    value: "service_based" as const,
    label: "Service-Based / Mobile",
    description:
      "Serves customers at their location or by appointment — no public storefront",
    icon: "🚗",
  },
  {
    value: "online_only" as const,
    label: "Online Only",
    description: "Operates via website, social media, or digital services",
    icon: "💻",
  },
];

export default function SuggestBusinessForm() {
  const [businessType, setBusinessType] = useState<BusinessType>("");
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

    // Honeypot
    const honeypot = ((fd.get("company") as string) || "").trim();
    if (honeypot.length > 0) {
      setMessage("Thank you! Your suggestion was submitted.");
      setLoading(false);
      form.reset();
      return;
    }

    const name = ((fd.get("name") as string) || "").trim();
    const city = ((fd.get("city") as string) || "").trim();
    const state = (
      ((fd.get("state") as string) || "FL").trim().toUpperCase() || "FL"
    ).slice(0, 2);
    const website = ((fd.get("website") as string) || "").trim() || null;
    const serviceArea = ((fd.get("service_area") as string) || "").trim();
    const userNotes = ((fd.get("notes") as string) || "").trim();

    if (!name) {
      setError("Business name is required.");
      setLoading(false);
      return;
    }

    if (!businessType) {
      setError("Please select a business type.");
      setLoading(false);
      return;
    }

    if (businessType !== "online_only" && !city) {
      setError("City is required.");
      setLoading(false);
      return;
    }

    // Determine is_address_public: only true for brick_and_mortar
    const isAddressPublic = businessType === "brick_and_mortar";

    // Build notes: prepend type context for admin review
    const typeLabel =
      TYPE_OPTIONS.find((t) => t.value === businessType)?.label ?? businessType;
    const notesParts: string[] = [`Type: ${typeLabel}`];
    if (serviceArea) notesParts.push(`Serves: ${serviceArea}`);
    if (userNotes) notesParts.push(userNotes);
    const notes = notesParts.join("\n\n");

    try {
      const res = await fetch("/api/suggest-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city: city || null, state, website, notes }),
      });

      if (res.status === 429) {
        setError("Too many submissions. Please wait a while and try again.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setMessage("Thank you! Your suggestion was submitted.");
      form.reset();
      setBusinessType("");
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <section className="space-y-5 text-center py-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 mx-auto">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12l5 5L20 7"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Suggestion received
          </h2>
          <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
            Thanks for helping build the directory. We'll review and add the
            business soon.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMessage(null)}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-5 py-2.5 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
        >
          Suggest another
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Suggestion details
        </h2>
        <p className="mt-2 text-[12px] text-slate-600 leading-relaxed">
          A few details go a long way. If you only know the name, submit that —
          we'll do the rest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot */}
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

        {/* Business type selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Business type <span className="text-[#C9A84C]">*</span>
          </label>
          <div className="grid gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const active = businessType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBusinessType(opt.value)}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-[rgba(201,168,76,0.5)] bg-[#FDF6E3] shadow-sm"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5" aria-hidden="true">
                    {opt.icon}
                  </span>
                  <div>
                    <p
                      className={`text-[13px] font-semibold ${active ? "text-[#5C4100]" : "text-slate-900"}`}
                    >
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                  {active && (
                    <span className="ml-auto mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path
                          d="M1.5 4l2 2 3-3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Business name — always shown */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Business name <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            name="name"
            maxLength={120}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
            placeholder="e.g. Soul Food Bistro"
          />
        </div>

        {/* City + State — shown for brick_and_mortar and service_based */}
        {(businessType === "brick_and_mortar" ||
          businessType === "service_based") && (
          <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                City <span className="text-[#C9A84C]">*</span>
              </label>
              <input
                name="city"
                maxLength={80}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
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
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
              />
            </div>
          </div>
        )}

        {/* Service area — only for service_based */}
        {businessType === "service_based" && (
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Service area
            </label>
            <input
              name="service_area"
              maxLength={200}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
              placeholder="e.g. Jacksonville & surrounding areas"
            />
            {/* Privacy acknowledgment */}
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-0.5 shrink-0 text-emerald-600"
              >
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                <strong>Privacy protected.</strong> Home or personal addresses
                for mobile professionals are never displayed publicly. Only
                your service area will be shown.
              </p>
            </div>
          </div>
        )}

        {/* Website */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Website or social media handle
            {businessType === "online_only" && (
              <span className="ml-1 text-[#C9A84C]">*</span>
            )}
          </label>
          <input
            name="website"
            maxLength={200}
            required={businessType === "online_only"}
            className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
            placeholder="https://…, Instagram, etc."
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Notes
          </label>
          <textarea
            name="notes"
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
            placeholder="Why this spot belongs on the radar, best days to go, what they're known for…"
          />
          <p className="text-[11px] text-slate-500">
            Basic details are enough. We'll handle the rest during
            verification.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading || !businessType}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-[#0E0C0A] shadow-[0_16px_34px_-22px_rgba(201,168,76,0.65)] transition hover:-translate-y-0.5 hover:bg-[#8B6914] hover:text-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit suggestion"}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-500">
            By submitting, you're helping build a directory people can trust.
          </p>
          <p className="mt-1 text-center text-[11px] text-slate-400">
            By submitting, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-slate-600">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-slate-600">Privacy Policy</a>.
          </p>
        </div>
      </form>
    </section>
  );
}
