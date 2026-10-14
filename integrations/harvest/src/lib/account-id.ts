import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let harvestAccountIdSchema = z
  .string()
  .regex(/^\d+$/)
  .optional()
  .describe(
    'Harvest account ID. Call list_accounts to discover authorized account IDs. Optional when the connection has one Harvest account.'
  );

export let resolveHarvestAccountId = (ctx: {
  input: { accountId?: string };
  auth: { accountId?: string };
  config: Record<string, unknown>;
}) => {
  // Preserve the account selected by connections saved before account discovery.
  let legacyAccountId =
    typeof ctx.config.accountId === 'string' ? ctx.config.accountId : undefined;
  let accountId = ctx.input.accountId ?? legacyAccountId ?? ctx.auth.accountId;
  if (!accountId) {
    throw createApiServiceError(
      'Call list_accounts and provide the selected Harvest accountId.'
    );
  }
  return accountId;
};
