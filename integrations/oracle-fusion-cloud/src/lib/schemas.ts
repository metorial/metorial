import { z } from 'zod';

export let paginationInputFields = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe('Maximum records to return in this page, from 1 to 100.'),
  offset: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .default(0)
    .describe('Zero-based page offset. Use nextOffset from the previous result to continue.')
};

export let pageOutputFields = {
  count: z.number().int().nonnegative().describe('Number of records returned in this page.'),
  limit: z.number().int().positive().describe('Page size used by Oracle Fusion.'),
  offset: z.number().int().nonnegative().describe('Zero-based offset used for this page.'),
  hasMore: z.boolean().describe('Whether Oracle Fusion reports more records.'),
  nextOffset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Offset to pass to the next list request when hasMore is true.')
};

export let resourceKeySchema = z
  .string()
  .min(1)
  .max(2048)
  .describe(
    'Opaque Oracle resource key returned by the corresponding list or get tool. This can differ from a business ID or number.'
  );
export let resourceIdSchema = z
  .string()
  .min(1)
  .describe('Oracle identifier represented as a string.');
