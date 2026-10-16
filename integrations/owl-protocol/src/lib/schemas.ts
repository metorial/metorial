import { z } from 'zod';

export let listInputSchema = z.object({
  limit: z.number().optional().describe('Maximum records to return in this page.'),
  skip: z.number().optional().describe('Number of records to skip for pagination.'),
  orderBy: z.string().optional().describe('Provider record field to sort by.'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort direction.')
});

export let rawSchema = z.unknown().optional().describe('Complete provider response data.');
