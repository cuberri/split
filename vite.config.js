import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base: './' makes the build work from any path (Cloudflare Pages root
// or a GitHub Pages sub-path like /split/). Routing uses the URL hash,
// so no server-side rewrite rules are needed.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { chunkSizeWarningLimit: 800 }, // the Firestore SDK alone is ~550 kB (~170 kB gzipped)
  define: {
    // Shown in the footer's tooltip (see src/lib/version.js).
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
