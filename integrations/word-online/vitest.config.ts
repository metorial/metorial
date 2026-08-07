import { createSlatesVitestConfig } from '@slates/test/config';

export default createSlatesVitestConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.e2e.ts']
  }
});
