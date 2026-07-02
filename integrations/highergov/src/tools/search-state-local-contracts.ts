import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchStateLocalContracts = SlateTool.create(spec, {
  name: 'Search State & Local Contracts',
  key: 'search_state_local_contracts',
  description: `Search state and local (SLED) government contract awards. Filter by captured date, contract start/end dates, or saved HigherGov search criteria. Useful for identifying state and local government contracting opportunities and analyzing market activity outside federal procurement.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      capturedDate: z
        .string()
        .optional()
        .describe('Filter to contracts captured on or after this date (YYYY-MM-DD)'),
      startDate: z.string().optional().describe('Filter by contract start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter by contract end date (YYYY-MM-DD)'),
      searchId: z
        .string()
        .optional()
        .describe('HigherGov saved search ID to apply complex search filters'),
      ordering: z.string().optional().describe('Sort order for results'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      contracts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of state and local contract records'),
      totalCount: z.number().describe('Total number of matching contracts'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getSlContracts({
      capturedDate: ctx.input.capturedDate,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      searchId: ctx.input.searchId,
      ordering: ctx.input.ordering,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        contracts: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** state & local contracts (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();
