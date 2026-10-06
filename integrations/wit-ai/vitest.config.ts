import { fileURLToPath } from 'node:url';
import { createSlatesVitestConfig } from '@slates/test/config';

export default createSlatesVitestConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { include: ['src/**/*.test.ts'] }
});
