import { ZohoInventoryClient } from './client';

export let createClient = (ctx: {
  auth: { token: string; apiDomain: string };
  config: { organizationId: string };
}) => {
  return new ZohoInventoryClient({
    token: ctx.auth.token,
    organizationId: ctx.config.organizationId,
    apiDomain: ctx.auth.apiDomain
  });
};
