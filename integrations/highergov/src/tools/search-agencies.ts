import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchAgencies = SlateTool.create(spec, {
  name: 'Search Agencies',
  key: 'search_agencies',
  description: `Search 3K+ federal and state/local government agencies with hierarchy data. Look up a specific agency by its HigherGov key, or browse the full agency list. Returns agency name, abbreviation, type, defense flag, and organizational hierarchy levels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agencyKey: z
        .number()
        .optional()
        .describe('HigherGov agency key to look up a specific agency'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      agencies: z.array(z.record(z.string(), z.unknown())).describe('List of agency records'),
      totalCount: z.number().describe('Total number of matching agencies'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getAgencies({
      agencyKey: ctx.input.agencyKey,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        agencies: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** agencies (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();
