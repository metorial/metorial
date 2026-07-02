import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; deskDomain?: string };
  config: { orgId: string; region: string };
}): Client => {
  return new Client({
    token: ctx.auth.token,
    orgId: ctx.config.orgId,
    region: ctx.config.region,
    deskDomain: ctx.auth.deskDomain
  });
};
