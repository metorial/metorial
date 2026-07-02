import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    'Triggers when a new message is sent in one or more monitored Revolt channels. Captures the message content, author, embeds, attachments, and reply information.'
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the new message'),
      channelId: z.string().describe('ID of the channel'),
      authorId: z.string().describe('ID of the message author'),
      content: z.string().optional().describe('Text content of the message'),
      editedAt: z.string().optional().describe('ISO 8601 timestamp if the message was edited'),
      hasAttachments: z.boolean().describe('Whether the message has attachments'),
      hasEmbeds: z.boolean().describe('Whether the message has embeds'),
      replies: z.array(z.string()).optional().describe('IDs of messages this replies to'),
      mentions: z.array(z.string()).optional().describe('User IDs mentioned'),
      pinned: z.boolean().optional().describe('Whether the message is pinned')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the message'),
      channelId: z.string().describe('ID of the channel'),
      authorId: z.string().describe('ID of the message author'),
      content: z.string().optional().describe('Text content of the message'),
      editedAt: z.string().optional().describe('ISO 8601 timestamp if the message was edited'),
      hasAttachments: z.boolean().describe('Whether the message has attachments'),
      hasEmbeds: z.boolean().describe('Whether the message has embeds'),
      replies: z.array(z.string()).optional().describe('IDs of messages this replies to'),
      mentions: z.array(z.string()).optional().describe('User IDs mentioned in the message'),
      pinned: z.boolean().optional().describe('Whether the message is pinned')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state ?? {};
      let channelIds: string[] = state.channelIds ?? [];

      // On first run, discover channels from the user's servers and DMs
      if (channelIds.length === 0) {
        try {
          let dmChannels = await client.fetchDMChannels();
          if (Array.isArray(dmChannels)) {
            channelIds = dmChannels.map((ch: any) => ch._id).slice(0, 10);
          }
        } catch {
          // May not have DM access
        }
      }

      if (channelIds.length === 0) {
        return {
          inputs: [],
          updatedState: { ...state, channelIds }
        };
      }

      let allMessages: any[] = [];
      let newLastMessageIds: Record<string, string> = { ...(state.lastMessageIds ?? {}) };

      for (let channelId of channelIds) {
        try {
          let lastId = state.lastMessageIds?.[channelId];
          let params: any = { limit: 50, sort: 'Latest' };
          if (lastId) {
            params.after = lastId;
          }
          let result = await client.fetchMessages(channelId, params);
          let messages = Array.isArray(result) ? result : (result.messages ?? []);

          if (messages.length > 0) {
            // Track the newest message ID for next poll
            let sortedByNewest = [...messages].sort((a: any, b: any) => {
              return a._id > b._id ? -1 : 1;
            });
            newLastMessageIds[channelId] = sortedByNewest[0]._id;
            allMessages.push(...messages);
          } else if (lastId) {
            newLastMessageIds[channelId] = lastId;
          }
        } catch {
          // Channel may have been deleted or we lost access
        }
      }

      // On first run (no lastMessageIds), just record current state without emitting events
      if (!state.lastMessageIds) {
        return {
          inputs: [],
          updatedState: { channelIds, lastMessageIds: newLastMessageIds }
        };
      }

      let inputs = allMessages.map((msg: any) => ({
        messageId: msg._id as string,
        channelId: msg.channel as string,
        authorId: msg.author as string,
        content: (msg.content ?? undefined) as string | undefined,
        editedAt: (msg.edited ?? undefined) as string | undefined,
        hasAttachments: Array.isArray(msg.attachments) && msg.attachments.length > 0,
        hasEmbeds: Array.isArray(msg.embeds) && msg.embeds.length > 0,
        replies: (msg.replies ?? undefined) as string[] | undefined,
        mentions: (msg.mentions ?? undefined) as string[] | undefined,
        pinned: (msg.pinned ?? undefined) as boolean | undefined
      }));

      return {
        inputs,
        updatedState: { channelIds, lastMessageIds: newLastMessageIds }
      };
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
          editedAt: ctx.input.editedAt,
          hasAttachments: ctx.input.hasAttachments,
          hasEmbeds: ctx.input.hasEmbeds,
          replies: ctx.input.replies,
          mentions: ctx.input.mentions,
          pinned: ctx.input.pinned
        }
      };
    }
  })
  .build();
