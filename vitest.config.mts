import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.mts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/setup.ts'], // Ensure this matches the renamed file
      include: ['src/**/*.{test,spec}.ts'],
      // 'forks' is much more reliable on Windows for inheriting setup state
      pool: 'forks',
      restoreMocks: true,
      server: {
        deps: {
          inline: [/@angular/, /@analogjs/, /rxjs/],
        },
      },
    },
  }),
);
