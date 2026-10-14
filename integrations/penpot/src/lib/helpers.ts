import { Client } from './client';

export let makeClient = (ctx: {
  config: Record<string, unknown>;
  auth: { token: string; baseUrl?: string };
}): Client => {
  let legacyBaseUrl = typeof ctx.config.baseUrl === 'string' ? ctx.config.baseUrl : undefined;
  return new Client({
    baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl ?? 'https://design.penpot.app',
    token: ctx.auth.token
  });
};
