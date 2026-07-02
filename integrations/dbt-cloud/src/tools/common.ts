import { z } from 'zod';
import { Client } from '../lib/client';

export let accountIdInput = {
  accountId: z
    .string()
    .optional()
    .describe(
      'Optional dbt Cloud account ID for this request. If omitted, the configured accountId is used. If neither is set, single-account tokens are used automatically; for multi-account tokens, call List Accounts and pass the selected accountId.'
    )
};

export let createDbtCloudClient = (ctx: {
  auth: { token: string };
  config: { accountId?: string; baseUrl: string };
  input?: { accountId?: string };
}) =>
  new Client({
    token: ctx.auth.token,
    accountId: ctx.input?.accountId ?? ctx.config.accountId,
    baseUrl: ctx.config.baseUrl
  });
