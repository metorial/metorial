import { createSlatesVitestConfig } from '@slates/test/config';

export default createSlatesVitestConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.e2e.ts']
  }
});
