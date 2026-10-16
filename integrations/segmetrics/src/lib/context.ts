import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let importScopeFields = {
  integrationId: z
    .string()
    .optional()
    .describe(
      'Import integration ID. In SegMetrics, open the gear menu → Integrations → the integration menu → Configure Integration; use the last number in the URL. Required unless this connection already stores a legacy integration ID.'
    )
};

interface ConnectionContext {
  auth: { token: string; accountId?: string };
  config: Record<string, unknown>;
}

export let resolveReportingConfig = (ctx: ConnectionContext) => {
  let accountId = ctx.auth.accountId ?? ctx.config.accountId;
  if (typeof accountId !== 'string' || !accountId.trim()) {
    throw createApiServiceError(
      'Reconnect with the Account ID and API key from SegMetrics Account Settings.'
    );
  }
  return { token: ctx.auth.token, accountId: accountId.trim() };
};

export let resolveImportConfig = (
  ctx: ConnectionContext & { input: { integrationId?: string } }
) => {
  let integrationId = ctx.input.integrationId ?? ctx.config.integrationId;
  if (typeof integrationId !== 'string' || !integrationId.trim()) {
    throw createApiServiceError(
      'Provide integrationId from the SegMetrics gear menu → Integrations → Configure Integration (the last number in the URL).'
    );
  }
  return { ...resolveReportingConfig(ctx), integrationId: integrationId.trim() };
};
