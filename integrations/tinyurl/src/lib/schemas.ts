import { z } from 'zod';

export let listFiltersSchema = z.object({
  status: z
    .enum(['available', 'archived'])
    .optional()
    .default('available')
    .describe('Filter by link status'),
  from: z.string().optional().describe('ISO 8601 datetime lower bound for creation date'),
  to: z.string().optional().describe('ISO 8601 datetime upper bound for creation date'),
  search: z
    .string()
    .optional()
    .describe('Search filter in format "alias:value" or "tag:value"')
});
