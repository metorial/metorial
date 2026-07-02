import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Subscription Lists',
  key: 'list_lists',
  description: `Retrieves a paginated list of all subscription lists in your Engage account. Returns list details including subscriber counts and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .describe('Number of lists per page (1-30, default 10)'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      previousCursor: z.string().optional().describe('Cursor for the previous page of results')
    })
  )
  .output(
    z.object({
      lists: z.array(
        z.object({
          listId: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          subscriberCount: z.number(),
          broadcastCount: z.number(),
          doubleOptin: z.boolean(),
          createdAt: z.string()
        })
      ),
      nextCursor: z.string().optional(),
      previousCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let result = await client.getLists({
      limit: ctx.input.limit,
      nextCursor: ctx.input.nextCursor,
      previousCursor: ctx.input.previousCursor
    });

    let lists = (result.data || []).map(l => ({
      listId: l.id,
      title: l.title,
      description: l.description,
      subscriberCount: l.subscriber_count,
      broadcastCount: l.broadcast_count,
      doubleOptin: l.double_optin,
      createdAt: l.created_at
    }));

    return {
      output: {
        lists,
        nextCursor: result.next_cursor,
        previousCursor: result.previous_cursor
      },
      message: `Found **${lists.length}** subscription list(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
