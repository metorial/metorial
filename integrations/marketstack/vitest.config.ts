import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/tools.schema.test.ts', 'src/deprecation.contract.test.ts'] }
});
