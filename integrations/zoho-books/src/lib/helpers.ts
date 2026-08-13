import { Client } from './client';

export let createClient = (ctx: {
  config: { organizationId: string };
  auth: { token: string; apiDomain: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    organizationId: ctx.config.organizationId,
    apiDomain: ctx.auth.apiDomain
  });
};
