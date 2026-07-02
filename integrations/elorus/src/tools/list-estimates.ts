import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `Search and list estimates (quotes/pro-forma invoices) in your Elorus organization. Supports filtering by status, client, date range, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Free-text search.'),
      status: z.string().optional().describe('Filter by estimate status.'),
      clientId: z.string().optional().describe('Filter by client contact ID.'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      periodFrom: z.string().optional().describe('Filter from this date (YYYY-MM-DD).'),
      periodTo: z.string().optional().describe('Filter until this date (YYYY-MM-DD).'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching estimates.'),
      estimates: z.array(z.any()).describe('Array of estimate objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listEstimates({
      search: ctx.input.search,
      status: ctx.input.status,
      client: ctx.input.clientId,
      ordering: ctx.input.ordering,
      periodFrom: ctx.input.periodFrom,
      periodTo: ctx.input.periodTo,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        estimates: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** estimate(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
