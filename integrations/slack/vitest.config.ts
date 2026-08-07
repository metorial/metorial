import { createSlatesVitestConfig } from '@slates/test/config';

export default createSlatesVitestConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.e2e.ts', 'tests/**/*.test.ts', 'tests/**/*.e2e.ts']
  }
});
