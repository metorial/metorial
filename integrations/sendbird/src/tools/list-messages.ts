import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve messages from a group or open channel. Messages are loaded relative to a timestamp or message ID, returning messages before and/or after that reference point.`,
  instructions: [
    'Provide either messageTs (timestamp) or messageId as the reference point.',
    'Use prevLimit/nextLimit to control how many messages before/after to return.',
    'If no reference point is given, defaults to the current time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelType: z.enum(['group_channels', 'open_channels']).describe('Type of channel'),
      channelUrl: z.string().describe('URL of the channel'),
      messageTs: z.number().optional().describe('Reference timestamp in Unix milliseconds'),
      messageId: z.number().optional().describe('Reference message ID'),
      prevLimit: z
        .number()
        .optional()
        .describe('Number of messages to load before the reference point (default 15)'),
      nextLimit: z
        .number()
        .optional()
        .describe('Number of messages to load after the reference point (default 15)'),
      reverse: z
        .boolean()
        .optional()
        .describe('If true, return messages in reverse chronological order'),
      senderId: z.string().optional().describe('Filter messages by sender user ID'),
      messageType: z
        .enum(['MESG', 'FILE', 'ADMM'])
        .optional()
        .describe('Filter by message type'),
      customType: z.string().optional().describe('Filter by custom message type'),
      includeReactions: z.boolean().optional().describe('Include reaction data')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.number().describe('Unique message ID'),
            messageType: z.string().describe('Type of message'),
            message: z.string().optional().describe('Text content'),
            senderId: z.string().optional().describe('Sender user ID'),
            senderNickname: z.string().optional().describe('Sender nickname'),
            channelUrl: z.string().describe('Channel URL'),
            customType: z.string().optional().describe('Custom message type'),
            data: z.string().optional().describe('Additional data'),
            createdAt: z.number().describe('Creation timestamp'),
            updatedAt: z.number().optional().describe('Last update timestamp'),
            mentionType: z.string().optional().describe('Mention type'),
            fileUrl: z.string().optional().describe('File URL for file messages'),
            fileName: z.string().optional().describe('File name for file messages')
          })
        )
        .describe('List of messages')
    })
  )
  .handleInvocation(async ctx => {
    for (let limit of [ctx.input.prevLimit, ctx.input.nextLimit]) {
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0 || limit > 200)) {
        throw createApiServiceError(
          'prevLimit and nextLimit must be whole numbers from 0 to 200.'
        );
      }
    }
    for (let reference of [ctx.input.messageTs, ctx.input.messageId]) {
      if (reference !== undefined && (!Number.isSafeInteger(reference) || reference < 0)) {
        throw createApiServiceError(
          'messageTs and messageId must be non-negative whole numbers.'
        );
      }
    }
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.listMessages(ctx.input.channelType, ctx.input.channelUrl, {
      messageTs: ctx.input.messageTs,
      messageId: ctx.input.messageId,
      prevLimit: ctx.input.prevLimit,
      nextLimit: ctx.input.nextLimit,
      reverse: ctx.input.reverse,
      senderId: ctx.input.senderId,
      messageType: ctx.input.messageType,
      customType: ctx.input.customType,
      includeReactions: ctx.input.includeReactions
    });

    let messages = (result.messages ?? []).map((m: any) => ({
      messageId: m.message_id,
      messageType: m.type ?? '',
      message: m.message ?? undefined,
      senderId: m.user?.user_id ?? undefined,
      senderNickname: m.user?.nickname ?? undefined,
      channelUrl: m.channel_url ?? ctx.input.channelUrl,
      customType: m.custom_type ?? undefined,
      data: m.data ?? undefined,
      createdAt: m.created_at ?? 0,
      updatedAt: m.updated_at ?? undefined,
      mentionType: m.mention_type ?? undefined,
      fileUrl: m.file?.url ?? undefined,
      fileName: m.file?.name ?? undefined
    }));

    return {
      output: {
        messages
      },
      message: `Retrieved **${messages.length}** message(s) from **${ctx.input.channelUrl}**.`
    };
  })
  .build();
