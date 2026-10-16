import { defineConfig } from 'vitest/config';
export default defineConfig({
  root: import.meta.dirname,
  test: { include: ['src/**/*.contract.test.ts'], passWithNoTests: false }
});
