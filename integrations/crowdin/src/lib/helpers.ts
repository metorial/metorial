import { CrowdinClient } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { organizationDomain?: string };
}) => {
  return new CrowdinClient({
    token: ctx.auth.token,
    organizationDomain: ctx.config.organizationDomain
  });
};
