import { FlyClient } from './client';

export let createClient = (ctx: {
  auth: { token: string; tokenScheme: string };
  config: { baseUrl: string };
}): FlyClient => {
  return new FlyClient({
    token: ctx.auth.token,
    tokenScheme: ctx.auth.tokenScheme,
    baseUrl: ctx.config.baseUrl
  });
};
