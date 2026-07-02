import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Available Lists',
  key: 'list_lists',
  description: `Retrieve available lists from Raiser's Edge NXT or Financial Edge NXT. Lists are pre-built or custom queries that return filtered result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of records to return.'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of available lists.'),
      lists: z.array(z.any()).describe('Array of list records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listLists({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let lists = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, lists },
      message: `Retrieved **${lists.length}** of ${count} available list(s).`
    };
  })
  .build();

export let getListResults = SlateTool.create(spec, {
  name: 'Get List Results',
  key: 'get_list_results',
  description: `Execute a saved list and retrieve its results. Returns the records matching the list's criteria. Use **List Available Lists** first to find the list ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('System record ID of the list to execute.'),
      limit: z.number().optional().describe('Number of records to return.'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of records in the list.'),
      records: z.array(z.any()).describe('Array of records from the list results.'),
      columns: z.array(z.any()).optional().describe('Column definitions for the list.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.getListResults(ctx.input.listId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let records = result?.results || result?.value || [];
    let count = result?.count || records.length;
    let columns = result?.columns;

    return {
      output: { count, records, columns },
      message: `Retrieved **${records.length}** of ${count} record(s) from list.`
    };
  })
  .build();
