import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export const workspaceIdSchema = z
  .string()
  .optional()
  .describe('Workspace ID. Call list_workspaces to discover authorized workspace IDs.');
export const botIdSchema = z
  .string()
  .optional()
  .describe(
    'Bot ID. Call list_bots with a workspace ID from list_workspaces to discover bots.'
  );
export const runtimeScopeFields = {
  botId: botIdSchema,
  integrationId: z
    .string()
    .optional()
    .describe(
      'Installed integration definition ID to act as. Discover it with list_integrations.'
    ),
  integrationAlias: z
    .string()
    .optional()
    .describe('Installed integration instance alias, when the bot has multiple instances.')
};

const resolveId = (
  input: string | undefined,
  config: unknown,
  key: string,
  discovery: string
) => {
  const legacy = isApiErrorRecord(config) ? config[key] : undefined;
  const id = input ?? (typeof legacy === 'string' ? legacy : undefined);
  if (!id?.trim()) throw createApiServiceError(`${key} is required. ${discovery}`);
  return id;
};

export const resolveBotId = (input: string | undefined, config: unknown) =>
  resolveId(
    input,
    config,
    'botId',
    'Call list_bots with a workspace ID from list_workspaces.'
  );
export const resolveWorkspaceId = (input: string | undefined, config: unknown) =>
  resolveId(
    input,
    config,
    'workspaceId',
    'Call list_workspaces to discover authorized workspaces.'
  );

export type RuntimeParams = {
  botId: string;
  integrationId?: string;
  integrationAlias?: string;
};
export const resolveRuntimeParams = (
  input: Omit<RuntimeParams, 'botId'> & { botId?: string },
  config: unknown
): RuntimeParams => ({
  botId: resolveBotId(input.botId, config),
  integrationId: input.integrationId,
  integrationAlias: input.integrationAlias
});

export const resolveTimeRange = (
  start: string | undefined,
  end: string | undefined,
  days: number
) => {
  const endDate = end ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(endDate)))
    throw createApiServiceError('Provide valid ISO 8601 start and end dates.');
  const startDate = start ?? new Date(Date.parse(endDate) - days * 86400000).toISOString();
  if (!Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)))
    throw createApiServiceError('Provide valid ISO 8601 start and end dates.');
  if (Date.parse(startDate) > Date.parse(endDate))
    throw createApiServiceError('The start date must not be after the end date.');
  return { startDate, endDate };
};
