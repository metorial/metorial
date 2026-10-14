import { SauceLabsClient } from './client';

export let createClient = (ctx: {
  auth: { username: string; token: string; dataCenter?: string };
  config: { dataCenter?: unknown };
}) => {
  return new SauceLabsClient({
    username: ctx.auth.username,
    token: ctx.auth.token,
    dataCenter:
      ctx.auth.dataCenter ??
      (typeof ctx.config.dataCenter === 'string' ? ctx.config.dataCenter : 'us-west-1')
  });
};
