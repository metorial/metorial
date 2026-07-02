import { TeamworkClient } from './client';

export let createClient = (ctx: {
  config: { siteName: string; region: string };
  auth: { token: string; apiEndpoint?: string };
}) => {
  return new TeamworkClient({
    token: ctx.auth.token,
    siteName: ctx.config.siteName,
    region: ctx.config.region,
    apiEndpoint: ctx.auth.apiEndpoint
  });
};
