import { e as createComponent, f as createAstro, l as renderComponent, n as renderScript, r as renderTemplate } from './astro/server_BnPQ4LVQ.mjs';

const $$Astro = createAstro();
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const propsStr = JSON.stringify(Astro2.props);
  const paramsStr = JSON.stringify(Astro2.params);
  return renderTemplate`${renderComponent($$result, "vercel-analytics", "vercel-analytics", { "data-props": propsStr, "data-params": paramsStr, "data-pathname": Astro2.url.pathname })} ${renderScript($$result, "/Users/hollow/Desktop/Developer/personal/vanta-jax/node_modules/.pnpm/@vercel+analytics@1.6.1_react@19.2.1/node_modules/@vercel/analytics/dist/astro/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/hollow/Desktop/Developer/personal/vanta-jax/node_modules/.pnpm/@vercel+analytics@1.6.1_react@19.2.1/node_modules/@vercel/analytics/dist/astro/index.astro", void 0);

export { $$Index as $ };
