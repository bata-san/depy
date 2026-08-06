import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: { host: true },
});
