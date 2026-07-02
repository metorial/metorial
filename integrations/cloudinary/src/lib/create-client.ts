import { Client } from './client';

export let createClient = (ctx: {
  config: { cloudName: string; region: 'us' | 'eu' | 'ap' };
  auth: { token: string; apiSecret: string };
}): Client => {
  return new Client({
    cloudName: ctx.config.cloudName,
    apiKey: ctx.auth.token,
    apiSecret: ctx.auth.apiSecret,
    region: ctx.config.region
  });
};
