import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://vantajax.com',
  adapter: vercel(),
  output: 'server',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  redirects: {
    '/business/[id]': '/businesses/[id]',
    // Uncomment when ready to go city-slug-prefixed:
    // '/businesses': '/jacksonville-fl/businesses',
    // '/businesses/[id]': '/jacksonville-fl/businesses/[id]',
  },
});
