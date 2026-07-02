import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecentPosts = SlateTool.create(spec, {
  name: 'Get Recent Posts',
  key: 'get_recent_posts',
  description: `Retrieves the most recently created threads in your Heartbeat community. Can filter by channel. "Recent" refers to creation timestamp — only the most recently created posts are returned.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().optional().describe('Filter threads by channel ID'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of threads to return (1-100)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — pass the last thread ID from the previous page')
    })
  )
  .output(
    z.object({
      threads: z
        .array(
          z.object({
            threadId: z.string().describe('Thread ID'),
            channelId: z.string().describe('Channel ID'),
            title: z.string().optional().describe('Thread title'),
            text: z.string().optional().describe('Plain text content'),
            userId: z.string().optional().describe('Author user ID'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of recent threads'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getRecentPosts({
      channelId: ctx.input.channelId,
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });

    let threads = result.data.map(t => ({
      threadId: t.id,
      channelId: t.channelId,
      title: t.title,
      text: t.text,
      userId: t.userId,
      createdAt: t.createdAt
    }));

    return {
      output: {
        threads,
        hasMore: result.hasMore
      },
      message: `Found ${threads.length} recent thread(s).${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
