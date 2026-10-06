import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['integrations/integrations/fivetran/src/**/*.test.ts'] }
});
