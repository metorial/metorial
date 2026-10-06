import { z } from 'zod';

export const paginationSchema = z.object({
  pageNumber: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
  nextPage: z.number().optional(),
  previousPage: z.number().optional()
});
