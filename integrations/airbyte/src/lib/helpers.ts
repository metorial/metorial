import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; baseUrl: string };
  config: { baseUrl: string };
}): Client => {
  let baseUrl = ctx.auth.baseUrl || ctx.config.baseUrl;
  return new Client({
    token: ctx.auth.token,
    baseUrl
  });
};
