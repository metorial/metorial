import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

let messageTarget = {
  channelType: z.enum(['group_channels', 'open_channels']).describe('Type of channel'),
  channelUrl: z.string().min(1).describe('URL of the channel'),
  messageId: z
    .number()
    .describe('Message ID from send_message, list_messages, or search_messages')
};

let messageOutput = z.object({
  messageId: z.number(),
  messageType: z.string(),
  channelUrl: z.string(),
  message: z.string().optional(),
  senderId: z.string().optional(),
  customType: z.string().optional(),
  data: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional()
});

type SendbirdMessage = {
  message_id: number;
  type: string;
  channel_url?: string | null;
  message?: string | null;
  user?: { user_id?: string | null } | null;
  custom_type?: string | null;
  data?: string | null;
  created_at: number;
  updated_at?: number | null;
};

let mapMessage = (message: SendbirdMessage, channelUrl: string) => ({
  messageId: message.message_id,
  messageType: message.type,
  channelUrl: message.channel_url ?? channelUrl,
  message: message.message ?? undefined,
  senderId: message.user?.user_id ?? undefined,
  customType: message.custom_type ?? undefined,
  data: message.data ?? undefined,
  createdAt: message.created_at,
  updatedAt: message.updated_at ?? undefined
});

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Get a specific message by its ID, including its content, sender, custom data, and timestamps.',
  tags: { readOnly: true }
})
  .input(z.object(messageTarget))
  .output(messageOutput)
  .handleInvocation(async ctx => {
    if (!Number.isSafeInteger(ctx.input.messageId) || ctx.input.messageId < 1) {
      throw createApiServiceError('messageId must be a positive whole number.');
    }
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });
    let message = await client.getMessage(
      ctx.input.channelType,
      ctx.input.channelUrl,
      ctx.input.messageId
    );
    return {
      output: mapMessage(message, ctx.input.channelUrl),
      message: `Retrieved message **${ctx.input.messageId}**.`
    };
  })
  .build();

export let updateMessage = SlateTool.create(spec, {
  name: 'Update Message',
  key: 'update_message',
  description:
    'Edit an existing message. Use its original message type. Text and admin messages support changing text; all message types support custom type and data changes.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ...messageTarget,
      messageType: z.enum(['MESG', 'FILE', 'ADMM']).describe('Original type of the message'),
      message: z.string().optional().describe('Replacement text for MESG or ADMM'),
      customType: z.string().optional().describe('Replacement custom message type'),
      data: z.string().optional().describe('Replacement additional message data'),
      mentionType: z
        .enum(['users', 'channel'])
        .optional()
        .describe('Whether to mention specified users or all users in the channel'),
      mentionedUserIds: z
        .array(z.string())
        .optional()
        .describe('IDs of users to mention when mentionType is users')
    })
  )
  .output(messageOutput)
  .handleInvocation(async ctx => {
    if (!Number.isSafeInteger(ctx.input.messageId) || ctx.input.messageId < 1) {
      throw createApiServiceError('messageId must be a positive whole number.');
    }
    if (ctx.input.messageType === 'FILE' && ctx.input.message !== undefined) {
      throw createApiServiceError(
        'Omit message when updating a FILE message; update customType or data instead.'
      );
    }
    let { message, customType, data, mentionType, mentionedUserIds } = ctx.input;
    if (
      [message, customType, data, mentionType, mentionedUserIds].every(
        value => value === undefined
      )
    ) {
      throw createApiServiceError('Provide at least one message field to update.');
    }
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });
    let result = await client.updateMessage(
      ctx.input.channelType,
      ctx.input.channelUrl,
      ctx.input.messageId,
      {
        messageType: ctx.input.messageType,
        message,
        customType,
        data,
        mentionType,
        mentionedUserIds
      }
    );
    return {
      output: mapMessage(result, ctx.input.channelUrl),
      message: `Updated message **${ctx.input.messageId}**.`
    };
  })
  .build();
