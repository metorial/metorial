import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['integrations/integrations/victorops/src/**/*.test.ts'] }
});
