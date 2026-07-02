import { Client } from './client';

export let createClient = (ctx: {
  config: { organizationId: string; region: string };
  auth: { token: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    organizationId: ctx.config.organizationId,
    region: ctx.config.region
  });
};
