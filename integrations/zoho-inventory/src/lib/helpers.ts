import { ZohoInventoryClient } from './client';

export let createClient = (ctx: {
  auth: { token: string; dataCenterDomain: string };
  config: { organizationId: string };
}) => {
  return new ZohoInventoryClient({
    token: ctx.auth.token,
    organizationId: ctx.config.organizationId,
    dataCenterDomain: ctx.auth.dataCenterDomain
  });
};
