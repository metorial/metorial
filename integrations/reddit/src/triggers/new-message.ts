import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    "Triggers when a new private message is received in the authenticated user's inbox."
})
  .input(
    z.object({
      messageId: z.string().describe('Message fullname'),
      author: z.string().optional().describe('Message sender username'),
      recipient: z.string().optional().describe('Message recipient username'),
      subject: z.string().optional().describe('Message subject'),
      body: z.string().optional().describe('Message body text'),
      createdUtc: z.number().optional().describe('Creation timestamp in UTC seconds'),
      isNew: z.boolean().optional().describe('Whether the message is unread')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message fullname'),
      author: z.string().optional().describe('Message sender username'),
      recipient: z.string().optional().describe('Message recipient username'),
      subject: z.string().optional().describe('Message subject'),
      body: z.string().optional().describe('Message body text'),
      createdAt: z.string().optional().describe('When the message was sent'),
      isNew: z.boolean().optional().describe('Whether the message is unread')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new RedditClient(ctx.auth.token);
      let state = ctx.state as {
        initialized?: boolean;
        lastCreatedUtc?: number;
        seenIds?: string[];
      } | null;
      let isFirstRun = !state?.initialized;
      let lastCreatedUtc = state?.lastCreatedUtc ?? 0;
      let seenIds = state?.seenIds ?? [];

      let data = await client.getUnread({ limit: 25 });
      let children = data?.data?.children ?? [];

      let allInputs: any[] = [];
      let newestCreatedUtc = lastCreatedUtc;
      let newSeenIds: string[] = [...seenIds];

      for (let child of children) {
        let d = child.data;
        if (!d?.name) continue;

        if (seenIds.includes(d.name)) continue;

        let createdUtc = d.created_utc ?? 0;
        if (createdUtc < lastCreatedUtc) continue;

        if (!isFirstRun) {
          allInputs.push({
            messageId: d.name,
            author: d.author,
            recipient: d.dest,
            subject: d.subject,
            body: d.body,
            createdUtc: d.created_utc,
            isNew: d.new
          });
        }

        newSeenIds.push(d.name);

        if (createdUtc > newestCreatedUtc) {
          newestCreatedUtc = createdUtc;
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          initialized: true,
          lastCreatedUtc: newestCreatedUtc,
          seenIds: newSeenIds.slice(-200)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.received',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          author: ctx.input.author,
          recipient: ctx.input.recipient,
          subject: ctx.input.subject,
          body: ctx.input.body,
          createdAt: ctx.input.createdUtc
            ? new Date(ctx.input.createdUtc * 1000).toISOString()
            : undefined,
          isNew: ctx.input.isNew
        }
      };
    }
  })
  .build();
