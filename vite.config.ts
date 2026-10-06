import { defineConfig } from 'vitest/config';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source maps a Sentry (spec 0007): solo en el job deploy, que trae el token.
// Los mapas se borran después de subirlos, y una subida fallida rompe el build.
function sentrySourceMaps() {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  if (!authToken) return [];
  return [
    sentryVitePlugin({
      authToken,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: process.env.VITE_APP_VERSION },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
      errorHandler: (error) => {
        throw error;
      },
    }),
  ];
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ...sentrySourceMaps()],
  // Mapas sin enlazar desde el bundle: nunca se publican (spec 0007).
  build: { sourcemap: 'hidden' },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
