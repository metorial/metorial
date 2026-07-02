import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/webflow',
  test: {
    include: ['src/**/*.test.ts']
  }
});
