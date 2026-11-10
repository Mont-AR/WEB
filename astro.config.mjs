// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // origen canónico: lo usan el canonical, Open Graph, robots.txt y sitemap.xml (src/lib/site.ts).
  // Se puede cambiar con la variable SITE_URL al construir.
  site: process.env.SITE_URL ?? 'https://montivero.ar',
  vite: {
    plugins: [tailwindcss()],
  },
});
