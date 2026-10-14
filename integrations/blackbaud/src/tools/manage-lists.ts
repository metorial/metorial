import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let listTypeSchema = z
  .enum(['Constituent', 'Gift', 'Action', 'Opportunity'])
  .optional()
  .default('Constituent')
  .describe("Raiser's Edge NXT record type for the saved list. Defaults to Constituent.");

export let listLists = SlateTool.create(spec, {
  name: 'List Available Lists',
  key: 'list_lists',
  description: `Retrieve saved Raiser's Edge NXT lists for a record type. Lists contain filtered sets of constituents, gifts, actions, or opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listType: listTypeSchema,
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number.')
        .min(1)
        .optional()
        .describe('Number of records to return.'),
      offset: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number.')
        .min(0)
        .optional()
        .describe('Number of records to skip for pagination.')
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

    let result = await client.listLists(ctx.input.listType);

    let lists = (result?.value || []).slice(
      ctx.input.offset ?? 0,
      ctx.input.limit === undefined ? undefined : (ctx.input.offset ?? 0) + ctx.input.limit
    );
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
      listId: z
        .string()
        .describe(
          'Saved list ID. Call list_lists with the matching listType to discover IDs.'
        ),
      sortToken: z
        .string()
        .optional()
        .describe('Stable pagination token from the previous response nextLink.'),
      continuationToken: z
        .string()
        .optional()
        .describe(
          'Continuation token from the previous response nextLink. Only supported when listType is Action.'
        ),
      listType: listTypeSchema,
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number.')
        .min(1)
        .optional()
        .describe('Number of records to return.'),
      offset: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number.')
        .min(0)
        .optional()
        .describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of records in the list.'),
      records: z.array(z.any()).describe('Array of records from the list results.'),
      columns: z
        .array(z.any())
        .optional()
        .describe('Column definitions if supplied by the provider.'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider URL for the next page, including its pagination token.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.continuationToken !== undefined && ctx.input.listType !== 'Action') {
      throw createApiServiceError(
        'Blackbaud continuationToken is only supported for saved Action lists. Set listType to Action for an Action list, or omit continuationToken.'
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.getListResults(ctx.input.listId, {
      listType: ctx.input.listType,
      sortToken: ctx.input.sortToken,
      continuationToken: ctx.input.continuationToken,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let records = result?.results || result?.value || [];
    let count = result?.count || records.length;
    let columns = result?.columns;

    return {
      output: { count, records, columns, nextLink: result?.next_link },
      message: `Retrieved **${records.length}** of ${count} record(s) from list.`
    };
  })
  .build();
