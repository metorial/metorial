import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPursuits = SlateTool.create(spec, {
  name: 'Search Pursuits',
  key: 'search_pursuits',
  description:
    'Read pursuit records belonging to the connected HigherGov account, including available pipeline, stage, owner, estimated value, deadlines, notes, tasks, and related opportunities. Use search_opportunities to research public government opportunities.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      referenceId: z.number().optional().describe('External numeric pursuit reference ID'),
      uniqueKey: z.string().optional().describe('Internal unique pursuit key'),
      searchId: z.string().optional().describe('HigherGov pursuit saved search ID'),
      pageNumber: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Records per page, from 1 to 100; default 10')
    })
  )
  .output(
    z.object({
      pursuits: z.array(z.record(z.string(), z.unknown())),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).getPursuits(ctx.input);
    return {
      output: {
        pursuits: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Returned **${response.results.length}** pursuits (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}).`
    };
  })
  .build();
