import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Search and list expense records. Expenses are simple records for tracking costs that can be linked to projects and marked as billable.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Free-text search.'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      periodFrom: z.string().optional().describe('Filter from this date (YYYY-MM-DD).'),
      periodTo: z.string().optional().describe('Filter until this date (YYYY-MM-DD).'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return expenses modified after this date.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching expenses.'),
      expenses: z.array(z.any()).describe('Array of expense objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listExpenses({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      periodFrom: ctx.input.periodFrom,
      periodTo: ctx.input.periodTo,
      modifiedAfter: ctx.input.modifiedAfter,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        expenses: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** expense(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
