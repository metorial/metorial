import { tmpdir } from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: path.join(tmpdir(), 'slates-test-triggers-vitest'),
  test: {
    include: ['src/**/*.test.ts']
  }
});
