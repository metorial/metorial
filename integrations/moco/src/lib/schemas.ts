import { z } from 'zod';

export let paginationFields = {
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Page number, starting at 1. Request subsequent pages to retrieve more records.'
    ),
  perPage: z.number().int().min(1).max(100).optional().describe('Records per page, up to 100.')
};
