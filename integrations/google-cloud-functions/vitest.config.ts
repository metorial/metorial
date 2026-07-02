import { createSlatesVitestConfig } from '@slates/test/config';

let GOOGLE_CLOUD_FUNCTIONS_TEST_TIMEOUT_MS = 10 * 60 * 1000;

export default createSlatesVitestConfig({
  test: {
    testTimeout: GOOGLE_CLOUD_FUNCTIONS_TEST_TIMEOUT_MS,
    hookTimeout: GOOGLE_CLOUD_FUNCTIONS_TEST_TIMEOUT_MS,
    include: ['src/**/*.test.ts', 'src/**/*.e2e.ts']
  }
});
