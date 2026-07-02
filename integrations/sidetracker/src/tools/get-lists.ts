import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve conversion lists from your Sidetracker account. Lists organize all conversions, showing the number of conversions per list at a glance. Use pagination to navigate through large sets of lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of lists per page')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of lists'),
      nextPage: z.string().nullable().describe('URL for the next page of results'),
      previousPage: z.string().nullable().describe('URL for the previous page of results'),
      lists: z
        .array(
          z.object({
            listId: z.string().describe('Unique identifier of the list'),
            name: z.string().describe('Name of the list'),
            description: z.string().describe('Description of the list'),
            preset: z.string().describe('Preset type of the list (tracking or checks)')
          })
        )
        .describe('Array of lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLists(ctx.input.page, ctx.input.pageSize);

    return {
      output: {
        count: result.count,
        nextPage: result.next,
        previousPage: result.previous,
        lists: result.results.map(list => ({
          listId: String(list.unique_id ?? ''),
          name: String(list.name ?? ''),
          description: String(list.description ?? ''),
          preset: String(list.preset ?? '')
        }))
      },
      message: `Retrieved **${result.results.length}** lists (${result.count} total).`
    };
  })
  .build();
