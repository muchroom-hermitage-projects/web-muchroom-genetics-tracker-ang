import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [angular(), tsconfigPaths()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },
});
