import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve all contact lists in the account. Returns list details including name, custom fields, tags, and contact counts by status (pending, subscribed, unsubscribed). Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results per page, 1–100'),
      startingAfter: z
        .string()
        .optional()
        .describe(
          'Cursor for pagination. Use the value from a previous response to get the next page.'
        )
    })
  )
  .output(
    z.object({
      lists: z.array(
        z.object({
          listId: z.string().describe('Unique identifier of the list'),
          name: z.string().describe('Name of the list'),
          doubleOptIn: z.boolean().describe('Whether double opt-in is enabled'),
          fields: z
            .array(
              z.object({
                tag: z.string(),
                type: z.string(),
                label: z.string(),
                fallback: z
                  .string()
                  .describe(
                    'Fallback display text; absent or null provider fallback is an empty string'
                  ),
                fallbackValue: z
                  .string()
                  .nullable()
                  .optional()
                  .describe('Original provider fallback, when supplied')
              })
            )
            .describe('Custom fields defined on the list'),
          tags: z.array(z.string()).describe('Tags defined on the list'),
          counts: z
            .object({
              pending: z.number(),
              subscribed: z.number(),
              unsubscribed: z.number()
            })
            .describe('Contact counts by status'),
          createdAt: z.string().describe('ISO 8601 creation timestamp')
        })
      ),
      pagingNext: z
        .string()
        .nullable()
        .describe('Cursor for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLists(ctx.input.startingAfter, ctx.input.limit);

    return {
      output: {
        lists: result.data,
        pagingNext: result.pagingNext
      },
      message: `Retrieved ${result.data.length} list(s).${result.pagingNext ? ' More results available.' : ''}`
    };
  })
  .build();
