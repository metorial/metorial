import { createSlatesVitestConfig } from '@slates/test/config';

export default createSlatesVitestConfig({
  test: { include: ['src/tool-schemas.test.ts'] }
});
