import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let accountIdSchema = z
  .string()
  .min(1)
  .describe(
    'Cloud account ID. Call list_accounts to discover authorized account IDs. May be omitted when the management key has access to exactly one account.'
  );

export let validatePointSelector = (
  pointIds: Array<string | number> | undefined,
  filter: unknown
) => {
  if ((pointIds !== undefined) === (filter !== undefined)) {
    throw createApiServiceError(
      'Provide exactly one of pointIds or filter to select the points.'
    );
  }
  if (pointIds !== undefined && pointIds.length === 0) {
    throw createApiServiceError('pointIds must contain at least one point ID.');
  }
  if (
    filter !== undefined &&
    (filter === null || typeof filter !== 'object' || Array.isArray(filter))
  ) {
    throw createApiServiceError('filter must be a Qdrant filter object.');
  }
};
