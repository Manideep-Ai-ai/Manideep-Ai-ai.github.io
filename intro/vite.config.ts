import {defineConfig} from 'vite';

// The intro mounts into <div id="intro"> at the top of the hub's static index.html.
// Artwork, fonts and the logo already live in the hub's assets/ folder (served at /assets/...).
export default defineConfig({
  publicDir: false,
  build: {
    outDir: '../assets/intro',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: {entryFileNames: 'intro.js', assetFileNames: 'intro[extname]'},
    },
  },
});
