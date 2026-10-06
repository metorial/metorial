import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().nonnegative().optional(),
  per: z.number().int().nonnegative().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional(),
  nextPage: z.number().int().positive().optional()
});

export const companyIdSchema = z
  .string()
  .describe('Company UUID from get_current_context. Each OAuth grant targets one company.');
