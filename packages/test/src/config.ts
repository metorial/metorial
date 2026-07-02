import { createVitestConfig } from '@lowerdeck/testing-tools';

export let createSlatesVitestConfig = (
  config: Parameters<typeof createVitestConfig>[0] = {}
) => createVitestConfig(config);
