import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; apiDomain: string };
  config: { orgId: string };
}): Client => {
  return new Client({
    token: ctx.auth.token,
    orgId: ctx.config.orgId,
    apiDomain: ctx.auth.apiDomain
  });
};
