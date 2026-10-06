import { defineConfig } from 'vitest/config';
export default defineConfig({
  root: import.meta.dirname,
  test: { include: ['src/schema.test.ts'] }
});
