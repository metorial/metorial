import { Client, type SentryRegion } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { organizationSlug: string; region: SentryRegion };
}) => {
  return new Client({
    token: ctx.auth.token,
    organizationSlug: ctx.config.organizationSlug,
    region: ctx.config.region
  });
};
