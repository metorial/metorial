import { SlatesProtocolClient } from './client';
import type { SlatesProtocolClientOptions } from './types';

export * from './client';
export * from './error';
export * from './transport';
export * from './types';

export let createSlatesClient = (opts: SlatesProtocolClientOptions) =>
  new SlatesProtocolClient(opts);
