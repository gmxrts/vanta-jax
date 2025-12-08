import { e as createComponent, k as renderHead, l as renderComponent, r as renderTemplate } from '../chunks/astro/server_BnPQ4LVQ.mjs';
/* empty css                                 */
import { $ as $$Index } from '../chunks/index_B0KXZgH1.mjs';
export { renderers } from '../renderers.mjs';

const $$About = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><title>About Vanta • Black-Owned Radar</title>${renderHead()}</head> <body class="min-h-screen bg-black text-slate-50"> <div class="relative min-h-screen overflow-hidden"> <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(59,7,100,0.6),_transparent_55%)] opacity-80"></div> <main class="relative z-10 flex min-h-screen items-center justify-center px-4 py-10"> <div class="w-full max-w-3xl rounded-3xl border border-purple-900/60 bg-black/80 px-5 py-8 sm:px-8 sm:py-10 shadow-[0_0_60px_rgba(168,85,247,0.35)]"> <header class="mb-6"> <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-300/80">
About Vanta
</p> <h1 class="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
Putting Black-owned businesses
<span class="block text-purple-300">on the radar.</span> </h1> </header> <div class="space-y-4 text-sm sm:text-base text-slate-200"> <p>
Vanta exists to make supporting Black-owned businesses <span class="font-semibold">effortless</span>.
              The price of community shouldn’t be inconvenience. But right now, finding Black-owned
              restaurants, services, nonprofits, or creatives usually means digging through old lists,
              social posts, or word of mouth.
</p> <p>
This project is a simple answer to that: a living directory where supporters can search by
              city, ZIP, and category to discover verified Black-owned and Black-led businesses.
</p> <h2 class="pt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
Where we are now
</h2> <p>
Today, Vanta is focused on <span class="font-semibold text-purple-300">Jacksonville, Florida</span>.
              The first version highlights food, services, retail, health, and nonprofits, with a mix of
              verified entries and community-submitted suggestions.
</p> <p>
This is an MVP. The data set is small on purpose, so it can be shaped by real people using it
              — not just assumptions.
</p> <h2 class="pt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
What’s coming next
</h2> <ul class="list-disc space-y-1 pl-5 text-sm text-slate-200"> <li>Growing the directory with more verified Black-owned businesses</li> <li>Better filtering and discovery for food, services, retail, health, and nonprofits</li> <li>Support for additional cities as the project matures</li> <li>A way for business owners to claim and update their listing</li> <li>Location-aware features like “near me” and map-based search</li> </ul> <h2 class="pt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
How you can help
</h2> <p>
If you know a Black-owned business that should be on the radar, use the
<span class="font-semibold text-purple-300"> suggestion form </span>
on the home page to submit it. Every suggestion helps this become more useful for the next
              person trying to support the community on purpose.
</p> </div> <div class="mt-6 text-xs text-slate-400 flex items-center justify-between"> <a href="/" class="text-purple-300 underline underline-offset-2 decoration-purple-400/80 hover:text-purple-200">
← Back to search
</a> <span>MVP build • Jacksonville, FL</span> </div> </div> </main> </div> ${renderComponent($$result, "Analytics", $$Index, {})} </body></html>`;
}, "C:/Users/Treezus/desktop/dev/vantajax/src/pages/about.astro", void 0);

const $$file = "C:/Users/Treezus/desktop/dev/vantajax/src/pages/about.astro";
const $$url = "/about";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$About,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
