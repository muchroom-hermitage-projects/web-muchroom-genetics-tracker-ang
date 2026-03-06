/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    angular(),
    tsconfigPaths(),
  ],
  test: {
    globals: true, // This allows us to use 'describe', 'it', 'expect' without importing them
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    server: {
      deps: {
        inline: [/@angular/, /@analogjs/, /rxjs/, /zone.js/]
      }
    }
  },
});
