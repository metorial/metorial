import { z } from 'zod';

export const accountIdSchema = z
  .string()
  .optional()
  .describe(
    'Account ID. Call list_accounts to discover authorized accounts, then pass the selected ID. Existing saved account settings are used only as a compatibility fallback.'
  );
export const pagingShape = {
  page: z.number().optional().describe('Current provider page, when returned.'),
  totalPages: z.number().optional().describe('Total provider pages, when returned.'),
  totalCount: z.number().optional().describe('Total matching records, when returned.'),
  count: z.number().optional().describe('Records in this page, when returned.')
};
export function paging(result: { meta?: Record<string, unknown> }) {
  const meta = result.meta ?? {};
  return {
    page: typeof meta.page === 'number' ? meta.page : undefined,
    totalPages: typeof meta.total_pages === 'number' ? meta.total_pages : undefined,
    totalCount: typeof meta.total_count === 'number' ? meta.total_count : undefined,
    count: typeof meta.count === 'number' ? meta.count : undefined
  };
}
export const queuedShape = {
  accepted: z
    .boolean()
    .describe('The provider accepted the activity for background processing.'),
  completed: z
    .boolean()
    .describe(
      'False until processing is independently confirmed; acceptance does not prove completion.'
    ),
  requestIds: z
    .array(z.string())
    .describe(
      'Provider request identifiers for support and correlation. No public request-status route is documented.'
    ),
  partialErrors: z
    .array(z.unknown())
    .optional()
    .describe('Partial provider errors, when returned. Accepted entries may still process.')
};
