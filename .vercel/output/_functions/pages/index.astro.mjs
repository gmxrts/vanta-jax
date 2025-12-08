import { e as createComponent, r as renderTemplate, l as renderComponent, k as renderHead } from '../chunks/astro/server_BnPQ4LVQ.mjs';
/* empty css                                 */
import { $ as $$Index$1 } from '../chunks/index_xBOz_KDz.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
export { renderers } from '../renderers.mjs';

const supabaseUrl = "https://bjpnpyotaiudawhudwhm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcG5weW90YWl1ZGF3aHVkd2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MjM5MjUsImV4cCI6MjA3ODM5OTkyNX0.n_pgdHJjl7Y9dOhysSIMX2Qy0WrE2QMu4Q-ZtX5thW4";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const categories = [
  { value: "", label: "All categories" },
  { value: "food", label: "Food & Dining" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health" },
  { value: "nonprofit", label: "Nonprofit" }
];
function BusinessSearch() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        setLoadingFeatured(true);
        const { data, error: error2 } = await supabase.from("businesses").select("*").eq("featured", true).order("verified", { ascending: false }).order("name", { ascending: true });
        if (error2) {
          console.error(error2);
          return;
        }
        setFeatured(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFeatured(false);
      }
    };
    loadFeatured();
  }, []);
  const fetchBusinesses = async (opts) => {
    const loc = (opts?.location || "").trim();
    const cat = opts?.category || "";
    const verified = opts?.verifiedOnly || false;
    let query = supabase.from("businesses").select("*");
    if (loc) {
      const pattern = `%${loc}%`;
      query = query.or(
        `city.ilike.${pattern},zip.ilike.${pattern},name.ilike.${pattern}`
      );
    }
    if (cat) {
      query = query.eq("category", cat);
    }
    if (verified) {
      query = query.eq("verified", true);
    }
    const { data, error: error2 } = await query.order("verified", { ascending: false }).order("name", { ascending: true });
    if (error2) {
      console.error(error2);
      throw error2;
    }
    return data || [];
  };
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const data = await fetchBusinesses({
        location,
        category,
        verifiedOnly
      });
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unexpected error occurred.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  const renderBusinessCard = (b) => /* @__PURE__ */ jsxs(
    "article",
    {
      className: "group flex h-full flex-col rounded-2xl border border-purple-900/60 bg-black/70 p-4 shadow-[0_0_30px_rgba(76,29,149,0.65)] transition hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.9)]",
      children: [
        /* @__PURE__ */ jsxs("header", { className: "mb-2 flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-slate-50", children: b.name }),
            /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[11px] text-slate-400", children: [
              b.category,
              " •",
              " ",
              b.area ? /* @__PURE__ */ jsxs(Fragment, { children: [
                b.area,
                " • ",
                b.city,
                ", ",
                b.state,
                " ",
                b.zip
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                b.city,
                ", ",
                b.state,
                " ",
                b.zip
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-1", children: [
            b.verified && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200", children: "Verified" }),
            b.featured && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200", children: "Featured" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-200", children: b.address }),
        b.description && /* @__PURE__ */ jsx("p", { className: "mt-2 line-clamp-3 text-xs text-slate-300", children: b.description }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-1 text-xs text-slate-200", children: [
          b.phone && /* @__PURE__ */ jsxs("p", { children: [
            "📞 ",
            b.phone
          ] }),
          b.website && /* @__PURE__ */ jsxs("p", { children: [
            "🌐",
            " ",
            /* @__PURE__ */ jsx(
              "a",
              {
                href: b.website,
                target: "_blank",
                rel: "noreferrer",
                className: "text-purple-300 underline underline-offset-2 decoration-purple-400/80 hover:text-purple-200",
                children: "Visit website"
              }
            )
          ] })
        ] })
      ]
    },
    b.id
  );
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(
      "form",
      {
        onSubmit: handleSearch,
        className: "rounded-2xl border border-purple-900/80 bg-black/70 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_0_35px_rgba(76,29,149,0.6)]",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-[2fr,1.5fr] sm:items-end", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-semibold uppercase tracking-wide text-slate-300", children: "Name, City, or ZIP" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: location,
                  onChange: (e) => setLocation(e.target.value),
                  placeholder: "e.g. Soul, Jacksonville, or 32205",
                  className: "w-full rounded-xl border border-purple-900/70 bg-black/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70 [color-scheme:dark]"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-semibold uppercase tracking-wide text-slate-300", children: "Category" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  value: category,
                  onChange: (e) => setCategory(e.target.value),
                  className: "w-full rounded-xl border border-purple-900/70 bg-black/90 px-3 py-2 text-sm text-slate-50 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70 [color-scheme:dark]",
                  children: categories.map((c) => /* @__PURE__ */ jsx(
                    "option",
                    {
                      value: c.value,
                      className: "bg-black text-slate-50",
                      children: c.label
                    },
                    c.value || "all"
                  ))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
            /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 text-[11px] text-slate-300", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: verifiedOnly,
                  onChange: (e) => setVerifiedOnly(e.target.checked),
                  className: "h-3 w-3 rounded border-purple-800 bg-black text-purple-500 focus:ring-purple-500/80"
                }
              ),
              /* @__PURE__ */ jsx("span", { children: "Show verified only" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  disabled: loading,
                  className: "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_25px_rgba(147,51,234,0.8)] transition hover:brightness-110 disabled:opacity-60",
                  children: loading ? "Searching…" : "Search"
                }
              ),
              /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-slate-400", children: [
                "Tip: Try a name like ",
                /* @__PURE__ */ jsx("span", { className: "font-mono text-purple-300", children: "Soul" }),
                " or a ZIP like ",
                /* @__PURE__ */ jsx("span", { className: "font-mono text-purple-300", children: "32205" }),
                "."
              ] })
            ] })
          ] })
        ]
      }
    ),
    error && /* @__PURE__ */ jsx("p", { className: "rounded-xl border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-100", children: error }),
    !error && hasSearched && !loading && /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between text-[11px] text-slate-300", children: /* @__PURE__ */ jsx("span", { children: results.length === 0 ? "No businesses found. Try broadening your search." : `Showing ${results.length} business${results.length === 1 ? "" : "es"}.` }) }),
    !hasSearched && !loadingFeatured && featured.length > 0 && /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400", children: "Start here • Featured in Jacksonville" }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-500", children: "Curated set of Black-owned spots to check out first." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: featured.map((b) => renderBusinessCard(b)) })
    ] }),
    hasSearched && /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: results.map((b) => renderBusinessCard(b)) }),
    !hasSearched && results.length === 0 && featured.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-400", children: "Use the search above to discover Black-owned businesses in your area." })
  ] });
}

function SuggestBusinessForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("FL");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const { error: error2 } = await supabase.from("business_suggestions").insert({
        name,
        city: city || null,
        state: state || null,
        website: website || null,
        notes: notes || null
      });
      if (error2) {
        console.error(error2);
        setError("Something went wrong. Please try again.");
        return;
      }
      setMessage("Thank you! Your suggestion was submitted.");
      setName("");
      setCity("");
      setState("FL");
      setWebsite("");
      setNotes("");
      if (typeof window !== "undefined" && window.plausible) {
        window.plausible("SuggestionSubmitted", {
          props: {
            city: city || "unknown",
            state: state || "unknown"
          }
        });
      }
    } catch (err) {
      console.error(err);
      setError("Unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxs("section", { className: "rounded-2xl border border-purple-900/40 bg-black/60 px-4 py-4 sm:px-5 sm:py-5", children: [
    /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-slate-50", children: "Suggest a Black-owned business" }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] text-slate-400", children: "Know a spot that should be on the radar? Share it here and we’ll review it before adding it to the directory." }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "mt-3 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Business name *" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            required: true,
            value: name,
            onChange: (e) => setName(e.target.value),
            className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
            placeholder: "Business name"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2 sm:grid-cols-[2fr,1fr]", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "City" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              value: city,
              onChange: (e) => setCity(e.target.value),
              className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
              placeholder: "e.g. Jacksonville"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "State" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              value: state,
              onChange: (e) => setState(e.target.value.toUpperCase()),
              maxLength: 2,
              className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
              placeholder: "FL"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Website or social link" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            value: website,
            onChange: (e) => setWebsite(e.target.value),
            className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
            placeholder: "https://..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Any notes" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            rows: 3,
            className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
            placeholder: "What do you love about this place?"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: submitting,
            className: "inline-flex items-center justify-center rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.8)] hover:brightness-110 disabled:opacity-60",
            children: submitting ? "Sending…" : "Submit suggestion"
          }
        ),
        message && /* @__PURE__ */ jsx("p", { className: "text-[11px] text-emerald-300", children: message }),
        error && /* @__PURE__ */ jsx("p", { className: "text-[11px] text-red-300", children: error })
      ] })
    ] })
  ] });
}

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="utf-8"><title>VantaJax\n    </title><script defer data-domain="vanta-jax.vercel.app" src="https://plausible.io/js/script.js"><\/script>', '</head> <body class="min-h-screen bg-black text-slate-50"> <div class="relative min-h-screen overflow-hidden"> <!-- subtle radial glow in background --> <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(59,7,100,0.6),_transparent_55%)] opacity-80"></div> <main class="relative z-10 flex min-h-screen items-center justify-center px-4 py-10"> <div class="w-full max-w-4xl rounded-3xl border border-purple-900/60 bg-black/80 px-5 py-8 sm:px-8 sm:py-10 shadow-[0_0_60px_rgba(168,85,247,0.35)]"> <header class="mb-8 sm:mb-10"> <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-300/80">\nVantaJax Project focused on Jacksonville, FL\n</p> <h1 class="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">\nFind Black-owned businesses in your area\n</h1> <p class="mt-3 max-w-2xl text-sm sm:text-base text-slate-300">\nRight now Vanta is focused on <span class="font-semibold text-purple-300">Jacksonville, FL</span>.\n              Search by city, ZIP, and category to discover Black-owned food, services, retail, health, and\n              nonprofits \u2014 with more cities coming over time.\n</p> </header> <!-- main content split into two clear sections --> <section class="space-y-10"> <div class="space-y-4"> <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">\nBrowse the radar\n</h2> ', ' </div> <div class="border-t border-purple-900/50 pt-6"> <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">\nHelp grow the map\n</h2> ', ' </div> </section> <footer class="mt-8 border-t border-purple-900/50 pt-4 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2"> <span>\nBuilt as an MVP to make Black-owned businesses easier to find in\n<span class="text-purple-300 font-medium"> Jacksonville, FL</span>.\n</span> <a href="/about" class="text-purple-300 underline underline-offset-2 decoration-purple-400/80 hover:text-purple-200">\nAbout Vanta\n</a> </footer> </div> </main> </div> ', " </body></html>"])), renderHead(), renderComponent($$result, "BusinessSearch", BusinessSearch, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/hollow/Desktop/Developer/personal/vanta-jax/src/components/BusinessSearch", "client:component-export": "default" }), renderComponent($$result, "SuggestBusinessForm", SuggestBusinessForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/hollow/Desktop/Developer/personal/vanta-jax/src/components/SuggestBusinessForm", "client:component-export": "default" }), renderComponent($$result, "Analytics", $$Index$1, {}));
}, "/Users/hollow/Desktop/Developer/personal/vanta-jax/src/pages/index.astro", void 0);

const $$file = "/Users/hollow/Desktop/Developer/personal/vanta-jax/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
