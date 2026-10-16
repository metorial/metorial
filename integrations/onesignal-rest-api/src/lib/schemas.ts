import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let appIdSchema = z
  .string()
  .optional()
  .describe(
    'App ID. Call list_apps with an Organization API Key to discover IDs, or use the App ID from Settings > Keys & IDs. Falls back to the legacy default.'
  );

export let validatePagination = (
  params: { limit?: number; offset?: number },
  maximum: number
) => {
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > maximum)
  ) {
    throw createApiServiceError(`limit must be an integer from 1 to ${maximum}.`);
  }
  if (params.offset !== undefined && (!Number.isInteger(params.offset) || params.offset < 0)) {
    throw createApiServiceError('offset must be a non-negative integer.');
  }
};
