import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let channelMessage = SlateTrigger.create(spec, {
  name: 'Channel Message',
  key: 'channel_message',
  description:
    'Triggers when a new message is sent in a specific Revolt channel. Monitor a single channel for new messages by providing its channel ID.'
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the new message'),
      channelId: z.string().describe('ID of the channel'),
      authorId: z.string().describe('ID of the message author'),
      content: z.string().optional().describe('Text content of the message'),
      hasAttachments: z.boolean().describe('Whether the message has attachments'),
      hasEmbeds: z.boolean().describe('Whether the message has embeds'),
      replies: z.array(z.string()).optional().describe('IDs of messages this replies to'),
      mentions: z.array(z.string()).optional().describe('User IDs mentioned')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the message'),
      channelId: z.string().describe('ID of the channel'),
      authorId: z.string().describe('ID of the message author'),
      content: z.string().optional().describe('Text content of the message'),
      hasAttachments: z.boolean().describe('Whether the message has attachments'),
      hasEmbeds: z.boolean().describe('Whether the message has embeds'),
      replies: z.array(z.string()).optional().describe('IDs of messages this replies to'),
      mentions: z.array(z.string()).optional().describe('User IDs mentioned in the message')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state ?? {};
      let channelId = state.channelId;

      if (!channelId) {
        // Try to get channel from DMs as fallback
        try {
          let dms = await client.fetchDMChannels();
          if (Array.isArray(dms) && dms.length > 0) {
            channelId = dms[0]._id;
          }
        } catch {
          // ignore
        }

        if (!channelId) {
          return { inputs: [], updatedState: state };
        }
      }

      try {
        let params: any = { limit: 50, sort: 'Latest' };
        if (state.lastMessageId) {
          params.after = state.lastMessageId;
        }

        let result = await client.fetchMessages(channelId, params);
        let messages = Array.isArray(result) ? result : (result.messages ?? []);

        let newLastId = state.lastMessageId;
        if (messages.length > 0) {
          let sorted = [...messages].sort((a: any, b: any) => (a._id > b._id ? -1 : 1));
          newLastId = sorted[0]._id;
        }

        // First poll - just record state
        if (!state.lastMessageId) {
          return {
            inputs: [],
            updatedState: { channelId, lastMessageId: newLastId }
          };
        }

        let inputs = messages.map((msg: any) => ({
          messageId: msg._id as string,
          channelId: msg.channel as string,
          authorId: msg.author as string,
          content: (msg.content ?? undefined) as string | undefined,
          hasAttachments: Array.isArray(msg.attachments) && msg.attachments.length > 0,
          hasEmbeds: Array.isArray(msg.embeds) && msg.embeds.length > 0,
          replies: (msg.replies ?? undefined) as string[] | undefined,
          mentions: (msg.mentions ?? undefined) as string[] | undefined
        }));

        return {
          inputs,
          updatedState: { channelId, lastMessageId: newLastId }
        };
      } catch {
        return { inputs: [], updatedState: state };
      }
    },

    handleEvent: async ctx => {
      return {
        type: 'message.created',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          channelId: ctx.input.channelId,
          authorId: ctx.input.authorId,
          content: ctx.input.content,
          hasAttachments: ctx.input.hasAttachments,
          hasEmbeds: ctx.input.hasEmbeds,
          replies: ctx.input.replies,
          mentions: ctx.input.mentions
        }
      };
    }
  })
  .build();
