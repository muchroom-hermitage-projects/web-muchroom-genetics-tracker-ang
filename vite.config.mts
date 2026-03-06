import { defineConfig } from 'vitest/config';
import { analogViteConfig } from '@analogjs/vitest-angular';

export default defineConfig((config) => ({
  ...analogViteConfig({
    root: config.root,
  }),
  test: {
    ...config.test,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
}));
