import { createApiServiceError } from 'slates';
import { Client, ZOHO_DESK_API_ORIGINS } from './client';
export let createClient = (ctx: {
  auth: { token: string; region: string };
  config?: { orgId?: string };
  input?: { orgId?: string };
}): Client => {
  let orgId = ctx.input?.orgId || ctx.config?.orgId;
  if (!orgId)
    throw createApiServiceError(
      'orgId is required. Call desk_list_organizations to discover authorized organizations.'
    );
  let apiDomain = ZOHO_DESK_API_ORIGINS[ctx.auth.region as keyof typeof ZOHO_DESK_API_ORIGINS];
  if (!apiDomain)
    throw createApiServiceError('Zoho Desk is unavailable in the connected region.');
  return new Client({ token: ctx.auth.token, orgId, apiDomain });
};
