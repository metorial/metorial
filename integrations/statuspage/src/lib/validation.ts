import { buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';
export const pageIdSchema = z
  .string()
  .optional()
  .describe('Page ID from list_pages. Overrides the optional connection default.');
export const paginationFields = {
  limit: z
    .number()
    .optional()
    .describe('Page size, an integer from 1 to 100. Defaults to 100.'),
  page: z.number().optional().describe('Page number, beginning at 1.')
};
export function pathId(value: string, label = 'ID') {
  if (
    !value.trim() ||
    value !== value.trim() ||
    value === '.' ||
    value === '..' ||
    /[/\\]/.test(value) ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError(
      `${label} must be a nonempty provider ID without path separators or padding.`
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError(`${label} must contain valid Unicode characters.`);
  }
}
export function validatePagination(
  params: { limit?: number; page?: number },
  firstPage = 1,
  maximum = 100
) {
  if (
    params.limit !== undefined &&
    (!Number.isSafeInteger(params.limit) || params.limit < 1 || params.limit > maximum)
  )
    throw createApiServiceError(
      maximum === Number.MAX_SAFE_INTEGER
        ? 'limit must be a positive safe integer.'
        : `limit must be an integer from 1 to ${maximum}.`
    );
  if (
    params.page !== undefined &&
    (!Number.isSafeInteger(params.page) || params.page < firstPage)
  )
    throw createApiServiceError(`page must be an integer beginning at ${firstPage}.`);
}
export function requireUpdate(data: Record<string, unknown>) {
  if (!Object.values(data).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
}
export function statuspageError(error: unknown) {
  return buildApiServiceError(error, {
    parent: {},
    providerLabel: 'Statuspage',
    reason: 'statuspage_api_error',
    formatMessage: ({ status }) =>
      status === 420 || status === 429
        ? 'Statuspage rate limit reached. Allow at least one second between requests and wait before retrying; do not repeat a write without checking its result.'
        : `Statuspage request failed${status ? ` (HTTP ${status})` : ''}. Check the API key, page/resource IDs, permissions, and request fields.`
  });
}
