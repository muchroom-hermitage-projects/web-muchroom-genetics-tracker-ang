import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/setup.ts'],
      include: ['src/**/*.{test,spec}.ts'],
      // 'forks' is much more reliable on Windows for inheriting setup state
      pool: 'forks',
      restoreMocks: true,
      server: {
        deps: {
          inline: [/@angular/, /@analogjs/, /rxjs/],
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './coverage',
        exclude: [
          '.ai/**',
          '.aiassistant/**',
          'coverage/**',
          'dist/**',
          '.fleet/**',
          '.husky/**',
          '.angular/**',
          'node_modules/**',
          'src/test-setup.ts',
          '**/*.spec.ts',
          'src/environments/**',
          'src/testing/**',
          'src/main.ts',
          'src/polyfills.ts',
        ],
        thresholds: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  }),
);
