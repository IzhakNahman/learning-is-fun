import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The app is bundled into one self-contained index.html (easy to host, share and wrap
// with Capacitor later). Static files in /public are copied next to it.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022', outDir: 'dist' },
  test: { environment: 'happy-dom', include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
