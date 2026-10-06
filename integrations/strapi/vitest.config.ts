import { createSlatesVitestConfig } from '@slates/test/config';

const config = createSlatesVitestConfig();
export default {
  ...config,
  root: import.meta.dirname,
  test: { ...config.test, include: ['src/schema.test.ts'] }
};
