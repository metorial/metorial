import { TeamworkClient } from './client';

export let createClient = (ctx: {
  config: { siteName?: string; region?: string };
  auth: { token: string; apiEndpoint?: string; authType?: 'oauth' | 'api_key' };
}) => {
  return new TeamworkClient({
    token: ctx.auth.token,
    siteName: ctx.config.siteName,
    region: ctx.config.region,
    apiEndpoint: ctx.auth.apiEndpoint,
    authType: ctx.auth.authType
  });
};
