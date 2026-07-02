import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getListRows = SlateTool.create(spec, {
  name: 'Get List Rows',
  key: 'get_list_rows',
  description: `Retrieve rows from a specific conversion list. Each row represents an individual conversion record or tracked entry. Supports pagination for lists with many rows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Unique ID of the list to retrieve rows from'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of rows per page')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of rows in the list'),
      nextPage: z.string().nullable().describe('URL for the next page of results'),
      previousPage: z.string().nullable().describe('URL for the previous page of results'),
      rows: z.array(z.record(z.string(), z.unknown())).describe('Array of row data objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getListRows(
      ctx.input.listId,
      ctx.input.page,
      ctx.input.pageSize
    );

    return {
      output: {
        count: result.count,
        nextPage: result.next,
        previousPage: result.previous,
        rows: result.results
      },
      message: `Retrieved **${result.results.length}** rows from list (${result.count} total).`
    };
  })
  .build();
