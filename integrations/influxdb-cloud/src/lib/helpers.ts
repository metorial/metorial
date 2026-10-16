import { isApiErrorRecord } from 'slates';
import { z } from 'zod';
import { Client } from './client';

export const orgIdInput = z
  .string()
  .optional()
  .describe(
    'Organization ID. Call list_organizations to discover IDs. Older connections can use their saved organization.'
  );

export let createClient = (ctx: {
  config: { baseUrl: string; [key: string]: unknown };
  auth: { token: string };
  input?: unknown;
}) => {
  const inputOrg = isApiErrorRecord(ctx.input) ? ctx.input.orgId : undefined;
  const orgId =
    typeof inputOrg === 'string' && inputOrg.length > 0
      ? inputOrg
      : typeof ctx.config.orgId === 'string'
        ? ctx.config.orgId
        : undefined;
  return new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token, orgId });
};
