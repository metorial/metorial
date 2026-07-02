import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { domain: string; apiVersion: 'freshworks' | 'classic' };
}): Client => {
  return new Client({
    token: ctx.auth.token,
    domain: ctx.config.domain,
    apiVersion: ctx.config.apiVersion
  });
};
