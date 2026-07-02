import { DatadogClient } from './client';
import type { DatadogAuthConfig } from './types';

export let createClient = (
  auth: {
    token: string;
    apiKey?: string;
    appKey?: string;
    authMethod: 'oauth' | 'apikey';
  },
  config: { site: string }
): DatadogClient => {
  let authConfig: DatadogAuthConfig = {
    token: auth.token,
    apiKey: auth.apiKey,
    appKey: auth.appKey,
    authMethod: auth.authMethod,
    site: config.site
  };
  return new DatadogClient(authConfig);
};
