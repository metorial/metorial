import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBulkSearchResults = SlateTool.create(spec, {
  name: 'Get Bulk Search Results',
  key: 'get_bulk_search_results',
  description: `Retrieve results from a bulk search by its file ID. Results are paginated with a maximum of 100 items per request. Use the returned pagination cursor for subsequent pages.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('File ID of the bulk search'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (default: 10, max: 100)'),
      next: z.boolean().optional().describe('Set true for next page, false for previous page'),
      sorts: z.array(z.any()).optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('Array of search result items'),
      sorts: z.array(z.any()).optional().describe('Pagination cursor for the next request'),
      total: z.number().optional().describe('Total number of results'),
      raw: z.any().optional().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBulkSearchResults({
      fileId: ctx.input.fileId,
      limit: ctx.input.limit,
      next: ctx.input.next,
      sorts: ctx.input.sorts
    });

    let items = result?.items || result?.data || [];

    return {
      output: {
        items,
        sorts: result?.sorts,
        total: result?.total,
        raw: result
      },
      message: `Retrieved **${items.length}** results from bulk search \`${ctx.input.fileId}\`.${result?.total ? ` Total: ${result.total}` : ''}`
    };
  })
  .build();
