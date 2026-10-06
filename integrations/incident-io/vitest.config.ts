import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['integrations/integrations/incident-io/src/**/*.test.ts'] }
});
