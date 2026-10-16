import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listThreadTimeline = SlateTool.create(spec, {
  key: 'list_thread_timeline',
  name: 'List Thread Timeline',
  description:
    'Read a thread’s messages, internal notes, custom events, and other timeline entries with cursor pagination. Message content is returned for email, chat, Slack, Microsoft Teams, and Discord; other entry types retain their type name.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      threadId: z.string().describe('Thread ID from get_thread or list_threads'),
      first: z.number().optional().default(25).describe('Number of entries to return (1–100)'),
      after: z.string().optional().describe('endCursor from the previous page')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          id: z.string(),
          customerId: z.string(),
          threadId: z.string(),
          timestamp: z.object({ iso8601: z.string(), unixTimestamp: z.string() }),
          entry: z
            .record(z.string(), z.unknown())
            .describe('Provider entry with __typename and type-specific content')
        })
      ),
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getThreadTimeline(
      ctx.input.threadId,
      ctx.input.first,
      ctx.input.after
    );
    return {
      output: {
        entries: result.edges.map(({ node }: any) => node),
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Returned **${result.edges.length}** timeline entries`
    };
  })
  .build();
