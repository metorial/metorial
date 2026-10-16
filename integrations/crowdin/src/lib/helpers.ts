import { CrowdinClient } from './client';
import { validateInput } from './errors';

export let createClient = (ctx: {
  auth: { token: string; organizationDomain?: string };
  input?: Record<string, unknown>;
  config: { organizationDomain?: string };
}) => {
  if (ctx.input) validateInput(ctx.input);
  return new CrowdinClient({
    token: ctx.auth.token,
    organizationDomain: ctx.auth.organizationDomain ?? ctx.config.organizationDomain
  });
};
