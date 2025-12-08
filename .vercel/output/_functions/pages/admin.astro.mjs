import { e as createComponent, k as renderHead, l as renderComponent, r as renderTemplate } from '../chunks/astro/server_BnPQ4LVQ.mjs';
/* empty css                                 */
import { $ as $$Index } from '../chunks/index_B0KXZgH1.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
export { renderers } from '../renderers.mjs';

const categories = [
  { value: "food", label: "Food & Dining" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health" },
  { value: "nonprofit", label: "Nonprofit" }
];
function AdminDashboard({ suggestions }) {
  const [items, setItems] = useState(suggestions || []);
  const [promotingId, setPromotingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [filter, setFilter] = useState("");
  const handlePromote = async (e, suggestionId) => {
    e.preventDefault();
    setGlobalError(null);
    setGlobalMessage(null);
    setPromotingId(suggestionId);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      suggestionId,
      name: fd.get("name")?.trim(),
      category: fd.get("category") || "services",
      address: fd.get("address")?.trim() || null,
      city: fd.get("city")?.trim() || null,
      state: fd.get("state")?.trim() || null,
      zip: fd.get("zip")?.trim() || null,
      phone: fd.get("phone")?.trim() || null,
      website: fd.get("website")?.trim() || null,
      description: fd.get("description")?.trim() || null,
      verified: fd.get("verified") === "on"
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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
  const handleReject = async (suggestionId) => {
    setGlobalError(null);
    setGlobalMessage(null);
    const confirmed = window.confirm("Reject and remove this suggestion?");
    if (!confirmed) return;
    setRejectingId(suggestionId);
    try {
      const res = await fetch("/api/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ suggestionId })
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
  const filteredItems = !normalizedFilter ? items : items.filter((s) => {
    const haystack = [
      s.name,
      s.city ?? "",
      s.state ?? "",
      s.notes ?? "",
      s.website ?? ""
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedFilter);
  });
  const totalCount = items.length;
  const visibleCount = filteredItems.length;
  if (!totalCount) {
    return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-purple-900/40 bg-black/60 px-4 py-4 sm:px-5 sm:py-5 text-sm text-slate-200", children: [
      /* @__PURE__ */ jsx("p", { children: "No suggestions waiting for review." }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] text-slate-400", children: "When supporters submit new businesses, they will appear here." })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-slate-300", children: [
        /* @__PURE__ */ jsxs("span", { className: "font-semibold text-slate-100", children: [
          visibleCount,
          " / ",
          totalCount
        ] }),
        " ",
        "suggestions visible",
        normalizedFilter && /* @__PURE__ */ jsxs("span", { className: "text-slate-500", children: [
          " (filtered by “",
          filter,
          "”)"
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: filter,
          onChange: (e) => setFilter(e.target.value),
          placeholder: "Filter by name, city, notes…",
          className: "w-full max-w-xs rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-[11px] text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
        }
      )
    ] }),
    globalError && /* @__PURE__ */ jsx("p", { className: "rounded-xl border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-100", children: globalError }),
    globalMessage && /* @__PURE__ */ jsx("p", { className: "rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100", children: globalMessage }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-4", children: filteredItems.map((s) => /* @__PURE__ */ jsxs(
      "article",
      {
        className: "rounded-2xl border border-purple-900/50 bg-black/70 p-4 sm:p-5 shadow-[0_0_25px_rgba(76,29,149,0.6)]",
        children: [
          /* @__PURE__ */ jsxs("header", { className: "mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-slate-50", children: s.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-slate-400", children: [
                "Suggested ",
                new Date(s.created_at).toLocaleString()
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-[11px] text-slate-400", children: s.city && s.state ? /* @__PURE__ */ jsxs("span", { children: [
              s.city,
              ", ",
              s.state
            ] }) : /* @__PURE__ */ jsx("span", { className: "italic text-slate-500", children: "Location not provided" }) })
          ] }),
          /* @__PURE__ */ jsxs(
            "form",
            {
              onSubmit: (e) => handlePromote(e, s.id),
              className: "space-y-3 text-xs text-slate-100",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-[2fr,1fr]", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Business name *" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        name: "name",
                        defaultValue: s.name,
                        className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Category" }),
                    /* @__PURE__ */ jsx(
                      "select",
                      {
                        name: "category",
                        defaultValue: "services",
                        className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70 [color-scheme:dark]",
                        children: categories.map((c) => /* @__PURE__ */ jsx("option", { value: c.value, className: "bg-black text-slate-50", children: c.label }, c.value))
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-[2fr,1fr]", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Address" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        name: "address",
                        className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
                        placeholder: "Street address"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "City" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          name: "city",
                          defaultValue: s.city || "",
                          className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-2 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "State" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          name: "state",
                          defaultValue: s.state || "FL",
                          maxLength: 2,
                          className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-2 py-1.5 text-xs uppercase outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "ZIP" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          name: "zip",
                          className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-2 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70"
                        }
                      )
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Phone" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        name: "phone",
                        className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
                        placeholder: "e.g. 904-555-1234"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Website or social link" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        name: "website",
                        defaultValue: s.website || "",
                        className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
                        placeholder: "https://..."
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-medium text-slate-300", children: "Description" }),
                  /* @__PURE__ */ jsx(
                    "textarea",
                    {
                      name: "description",
                      defaultValue: s.notes || "",
                      rows: 3,
                      className: "w-full rounded-lg border border-purple-900/70 bg-black/60 px-3 py-1.5 text-xs outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/70",
                      placeholder: "Short description for the directory listing"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
                  /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 text-[11px] text-slate-300", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "checkbox",
                        name: "verified",
                        defaultChecked: true,
                        className: "h-3 w-3 rounded border-purple-800 bg-black text-purple-500 focus:ring-purple-500/80"
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { children: "Mark as verified Black-owned" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleReject(s.id),
                        disabled: rejectingId === s.id,
                        className: "inline-flex items-center justify-center rounded-lg border border-red-500/70 bg-black px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-60",
                        children: rejectingId === s.id ? "Rejecting…" : "Reject"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "submit",
                        disabled: promotingId === s.id,
                        className: "inline-flex items-center justify-center rounded-lg bg-purple-500 px-3 py-1.5 text-[11px] font-semibold text-black shadow-[0_0_18px_rgba(147,51,234,0.8)] hover:brightness-110 disabled:opacity-60",
                        children: promotingId === s.id ? "Promoting…" : "Promote to directory"
                      }
                    )
                  ] })
                ] })
              ]
            }
          )
        ]
      },
      s.id
    )) })
  ] });
}

const prerender = false;
const $$Admin = createComponent(async ($$result, $$props, $$slots) => {
  const supabaseUrl = "https://bjpnpyotaiudawhudwhm.supabase.co";
  const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcG5weW90YWl1ZGF3aHVkd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjgyMzkyNSwiZXhwIjoyMDc4Mzk5OTI1fQ.hLlzS-G3rsTEzih1r90liZ3-T-EnkAYmY4Ex26Z3fs8";
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: suggestions = [], error } = await supabase.from("business_suggestions").select("*").order("created_at", { ascending: false }) ;
  if (error) {
    console.error("Error loading suggestions for admin:", error);
  }
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><title>Admin • Vanta Black-Owned Radar</title>${renderHead()}</head> <body class="min-h-screen bg-black text-slate-50"> <div class="relative min-h-screen overflow-hidden"> <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(59,7,100,0.6),_transparent_55%)] opacity-80"></div> <main class="relative z-10 flex min-h-screen items-center justify-center px-4 py-10"> <div class="w-full max-w-5xl rounded-3xl border border-purple-900/60 bg-black/80 px-5 py-8 sm:px-8 sm:py-10 shadow-[0_0_60px_rgba(168,85,247,0.35)]"> <header class="mb-6 flex items-center justify-between gap-3"> <div> <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-300/80">
Admin
</p> <h1 class="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
Business suggestions
</h1> <p class="mt-1 text-[11px] sm:text-xs text-slate-400">
Internal view for reviewing and promoting suggestions into the main directory.
                This page is not meant to be public.
</p> </div> <a href="/" class="text-[11px] text-purple-300 underline underline-offset-2 decoration-purple-400/80 hover:text-purple-200">
← Back to search
</a> </header> ${renderComponent($$result, "AdminDashboard", AdminDashboard, { "client:load": true, "suggestions": suggestions, "client:component-hydration": "load", "client:component-path": "C:/Users/Treezus/desktop/dev/vantajax/src/components/AdminDashboard", "client:component-export": "default" })} </div> </main> </div> ${renderComponent($$result, "Analytics", $$Index, {})} </body></html>`;
}, "C:/Users/Treezus/desktop/dev/vantajax/src/pages/admin.astro", void 0);
const $$file = "C:/Users/Treezus/desktop/dev/vantajax/src/pages/admin.astro";
const $$url = "/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
