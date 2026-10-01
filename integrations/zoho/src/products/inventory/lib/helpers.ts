import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { ZohoInventoryClient } from './client';

export const createClient = (ctx: {
  auth: { token: string; apiDomain: string };
  config?: { organizationId?: string };
  input?: { organizationId?: string };
}) => {
  const organizationId = ctx.input?.organizationId;
  if (!organizationId)
    throw createApiServiceError(
      'Organization ID is required. Call inventory_list_organizations to discover organizations, then provide organizationId.'
    );
  return new ZohoInventoryClient({
    token: ctx.auth.token,
    apiDomain: ctx.auth.apiDomain,
    organizationId
  });
};

export const organizationIdSchema = z
  .string()
  .min(1)
  .describe(
    'Organization ID. Call inventory_list_organizations to discover authorized organizations.'
  );
