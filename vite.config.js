import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    sourcemap: true,
    outDir: 'dist'
  },
  server: {
    fs: {
      strict: false
    }
  }
});
