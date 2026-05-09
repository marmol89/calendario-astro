// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  base: process.env.CAPACITOR ? "/" : (process.env.GITHUB_PAGES ? "/calendario-astro/" : "/"),
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()]
  }
});