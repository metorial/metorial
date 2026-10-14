import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a message in Connecteam Chat. Can send to an existing conversation (team chat/channel) or as a private message (DM) to a specific user via a custom publisher. If a private conversation already exists, it will be reused.`,
  constraints: [
    'Message max 1000 characters',
    'Only one non-image file attachment per message',
    'Files must be pre-uploaded via Attachments API with featureType "chat"'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      target: z
        .enum(['conversation', 'private_message'])
        .describe('Send to an existing conversation or as a private message to a user'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID (required for "conversation" target)'),
      userId: z
        .string()
        .optional()
        .describe(
          'User ID to send private message to (required for "private_message" target)'
        ),
      message: z.string().max(1000).describe('Message text (max 1000 characters)'),
      senderId: z
        .number()
        .optional()
        .describe(
          'Required custom publisher ID. Call list_conversations with includePublishers to discover it.'
        ),
      attachments: z
        .array(
          z.object({
            fileId: z.string().describe('Pre-uploaded file ID'),
            type: z
              .enum(['image', 'file'])
              .optional()
              .describe('Attachment type. Defaults to file.')
          })
        )
        .optional()
        .describe('File attachments (upload via Attachments API first)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });

    if (ctx.input.senderId === undefined) {
      throw createApiServiceError(
        'senderId is required. Call list_conversations with includePublishers to find a custom publisher.'
      );
    }
    if (!ctx.input.message.trim()) {
      throw createApiServiceError('message must contain text.');
    }
    let attachments = ctx.input.attachments?.map(attachment => ({
      fileId: attachment.fileId,
      type: attachment.type ?? ('file' as const)
    }));
    if (
      attachments &&
      attachments.filter(attachment => attachment.type === 'file').length > 1
    ) {
      throw createApiServiceError('Send at most one non-image file attachment per message.');
    }
    let body = {
      text: ctx.input.message,
      senderId: ctx.input.senderId,
      attachments
    };

    if (ctx.input.target === 'conversation') {
      if (!ctx.input.conversationId)
        throw createApiServiceError('conversationId is required for conversation target.');
      let result = await client.sendMessageToConversation(ctx.input.conversationId, body);
      return {
        output: { result },
        message: `Sent message to conversation **${ctx.input.conversationId}**.`
      };
    }

    if (ctx.input.target === 'private_message') {
      if (!ctx.input.userId)
        throw createApiServiceError('userId is required for private_message target.');
      let result = await client.sendPrivateMessage(ctx.input.userId, body);
      return {
        output: { result },
        message: `Sent private message to user **${ctx.input.userId}**.`
      };
    }

    throw createApiServiceError(`Unknown target: ${ctx.input.target}`);
  })
  .build();
