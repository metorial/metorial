import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/github',
  test: {
    include: ['src/**/*.test.ts']
  }
});
