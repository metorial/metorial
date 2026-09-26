import { createSlatesVitestConfig } from '@slates/test/config';

export default createSlatesVitestConfig({
  test: {
    include: ['src/tools.schema.test.ts']
  }
});
