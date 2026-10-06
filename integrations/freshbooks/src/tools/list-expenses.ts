import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    expenses: z.array(
      z.object({
        expenseId: z.number(),
        amount: z.any().optional(),
        currencyCode: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        categoryId: z.number().nullable().optional(),
        vendorName: z.string().nullable().optional(),
        clientId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.number().nullable().optional()
      })
    ),
    totalCount: z.number(),
    currentPage: z.number(),
    totalPages: z.number()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Search and list expenses in FreshBooks. Supports filtering by client, category, project, and date range. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      clientId: z.number().optional().describe('Filter by client ID'),
      categoryId: z.number().optional().describe('Filter by expense category ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter expenses on or after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter expenses on or before this date (YYYY-MM-DD)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_expenses', ctx, outputSchema))
  .build();
