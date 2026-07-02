import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPosts = SlateTrigger.create(spec, {
  name: 'New Posts',
  key: 'new_posts',
  description:
    '[Polling fallback] Polls for new threads created in your Heartbeat community. Detects newly created threads and returns their content.'
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread'),
      channelId: z.string().describe('Channel ID where the thread was created'),
      title: z.string().optional().describe('Title of the thread'),
      text: z.string().optional().describe('Plain text content'),
      userId: z.string().optional().describe('Author user ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the thread'),
      channelId: z.string().describe('Channel ID where the thread was created'),
      title: z.string().optional().describe('Title of the thread'),
      text: z.string().optional().describe('Plain text content'),
      userId: z.string().optional().describe('Author user ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let lastSeenId = ctx.state?.lastSeenId as string | undefined;

      let result = await client.getRecentPosts({ limit: 50 });

      let threads = result.data;

      if (lastPolledAt) {
        threads = threads.filter(t => t.createdAt > lastPolledAt);
      }

      if (lastSeenId) {
        let seenIndex = threads.findIndex(t => t.id === lastSeenId);
        if (seenIndex >= 0) {
          threads = threads.slice(0, seenIndex);
        }
      }

      let newLastPolledAt = threads.length > 0 ? threads[0]!.createdAt : lastPolledAt;
      let newLastSeenId = threads.length > 0 ? threads[0]!.id : lastSeenId;

      return {
        inputs: threads.map(t => ({
          threadId: t.id,
          channelId: t.channelId,
          title: t.title,
          text: t.text,
          userId: t.userId,
          createdAt: t.createdAt
        })),
        updatedState: {
          lastPolledAt: newLastPolledAt,
          lastSeenId: newLastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'thread.created',
        id: ctx.input.threadId,
        output: {
          threadId: ctx.input.threadId,
          channelId: ctx.input.channelId,
          title: ctx.input.title,
          text: ctx.input.text,
          userId: ctx.input.userId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
