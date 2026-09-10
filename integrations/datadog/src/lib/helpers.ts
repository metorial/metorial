import { DatadogClient } from './client';
import type { DatadogAuthConfig } from './types';

export let createClient = (
  auth: {
    token: string;
    apiKey?: string;
    appKey?: string;
    site?: string;
    authMethod: 'oauth' | 'apikey';
  },
  config: { site?: string }
): DatadogClient => {
  let authConfig: DatadogAuthConfig = {
    token: auth.token,
    apiKey: auth.apiKey,
    appKey: auth.appKey,
    authMethod: auth.authMethod,
    site: auth.site ?? config.site ?? 'datadoghq.com'
  };
  return new DatadogClient(authConfig);
};
