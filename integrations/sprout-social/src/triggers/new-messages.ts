import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newMessages = SlateTrigger.create(spec, {
  name: 'New Messages',
  key: 'new_messages',
  description:
    'Triggers when new messages (posts, comments, DMs, mentions, reviews, replies) are received by or published to owned social profiles.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique identifier for the message.'),
      network: z.string().optional().describe('Social network the message belongs to.'),
      postType: z.string().optional().describe('Type of the post.'),
      postCategory: z.string().optional().describe('Category of the post.'),
      createdTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the message was created.'),
      text: z.string().optional().describe('Text content of the message.'),
      permaLink: z.string().optional().describe('Permanent link to the message.'),
      from: z.any().optional().describe('Sender information.'),
      tags: z.array(z.any()).optional().describe('Tags applied to the message.'),
      raw: z.any().optional().describe('Full raw message data.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier for the message.'),
      network: z.string().optional().describe('Social network the message belongs to.'),
      postType: z.string().optional().describe('Type of the post.'),
      postCategory: z.string().optional().describe('Category of the post.'),
      createdTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the message was created.'),
      text: z.string().optional().describe('Text content of the message.'),
      permaLink: z.string().optional().describe('Permanent link to the message.'),
      from: z.any().optional().describe('Sender information.'),
      tags: z.array(z.any()).optional().describe('Tags applied to the message.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId
      });

      // Get groups to poll messages from
      let groupsResult = await client.getGroups();
      let groups: any[] = groupsResult?.data ?? [];

      if (groups.length === 0) {
        return { inputs: [], updatedState: ctx.state };
      }

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let now = new Date().toISOString();

      // Default to 1 hour ago on first poll
      let startTime = lastPollTime || new Date(Date.now() - 3600000).toISOString();

      let allInputs: any[] = [];

      // Poll messages from first group (primary)
      let firstGroup = groups[0];
      if (!firstGroup?.id) {
        return { inputs: [], updatedState: { ...ctx.state, lastPollTime: now } };
      }

      try {
        let result = await client.getMessages({
          filters: [`group_id.eq(${firstGroup.id})`, `created_time.in(${startTime}..${now})`],
          fields: [
            'network',
            'created_time',
            'post_category',
            'post_type',
            'perma_link',
            'text',
            'from',
            'internal.tags.id'
          ],
          sort: ['created_time:desc'],
          limit: 50
        });

        let messages: any[] = result?.data ?? [];
        for (let msg of messages) {
          let msgId = msg.guid || msg.id || `${msg.created_time}-${msg.post_type}`;
          allInputs.push({
            messageId: String(msgId),
            network: msg.network,
            postType: msg.post_type,
            postCategory: msg.post_category,
            createdTime: msg.created_time,
            text: msg.text,
            permaLink: msg.perma_link,
            from: msg.from,
            tags: msg.internal?.tags,
            raw: msg
          });
        }
      } catch {
        // If fetching fails, continue with empty results
      }

      return {
        inputs: allInputs,
        updatedState: {
          ...ctx.state,
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `message.${(ctx.input.postCategory || 'received').toLowerCase()}`,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          network: ctx.input.network,
          postType: ctx.input.postType,
          postCategory: ctx.input.postCategory,
          createdTime: ctx.input.createdTime,
          text: ctx.input.text,
          permaLink: ctx.input.permaLink,
          from: ctx.input.from,
          tags: ctx.input.tags
        }
      };
    }
  });
