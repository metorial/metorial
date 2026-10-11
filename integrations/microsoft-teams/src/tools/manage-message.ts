import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { graphAuthMethodKeys } from '../auth';
import { GraphClient } from '../lib/client';
import {
  buildMessagePayload,
  importanceInputSchema,
  mentionsInputSchema
} from '../lib/messages';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

// https://learn.microsoft.com/en-us/graph/api/chatmessage-update?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/chatmessage-softdelete?view=graph-rest-1.0
export let manageMessage = SlateTool.create(spec, {
  name: 'Manage Message',
  key: 'manage_message',
  description: `Edit or delete one of your own messages in a Microsoft Teams chat or channel. Deleted messages show as deleted in Teams.`,
  instructions: [
    'For a chat message, provide chatId and messageId.',
    'For a channel post, provide teamId, channelId, and messageId. For a reply in a channel thread, also provide parentMessageId (the thread root) and set messageId to the reply.',
    'For action "update", provide the full new content; it replaces the existing body.',
    'Editing or deleting channel messages requires the Work Only (Full Access) connection.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(microsoftTeamsActionScopes.manageMessage)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      action: z.enum(['update', 'delete']).describe('Edit (update) or delete the message'),
      messageId: z.string().describe('ID of the message to edit or delete'),
      chatId: z.string().optional().describe('ID of the chat (for chat messages)'),
      teamId: z.string().optional().describe('ID of the team (for channel messages)'),
      channelId: z.string().optional().describe('ID of the channel (for channel messages)'),
      parentMessageId: z
        .string()
        .optional()
        .describe('Thread root message ID when messageId is a reply in a channel thread'),
      content: z.string().optional().describe('New message content (required for update)'),
      contentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe('Content type of the new content (for update)'),
      importance: importanceInputSchema,
      mentions: mentionsInputSchema
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the edited or deleted message'),
      chatId: z.string().optional().describe('Chat ID, for chat messages'),
      teamId: z.string().optional().describe('Team ID, for channel messages'),
      channelId: z.string().optional().describe('Channel ID, for channel messages'),
      action: z.enum(['update', 'delete']).describe('Action that was performed'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let inChannel = !!(input.teamId || input.channelId);

    if (input.chatId && inChannel) {
      throw createApiServiceError(
        'Provide either chatId (chat message) or teamId and channelId (channel message), not both.',
        { reason: 'microsoft_teams_message_target_ambiguous' }
      );
    }
    if (!input.chatId && !(input.teamId && input.channelId)) {
      throw createApiServiceError(
        'Provide chatId for a chat message, or both teamId and channelId for a channel message.',
        { reason: 'microsoft_teams_message_target_missing' }
      );
    }
    if (input.parentMessageId && !inChannel) {
      throw createApiServiceError('parentMessageId applies only to channel messages.', {
        reason: 'microsoft_teams_message_parent_invalid'
      });
    }

    let client = new GraphClient({ token: ctx.auth.token });
    let target = input.chatId
      ? { chatId: input.chatId }
      : { teamId: input.teamId, channelId: input.channelId };

    if (input.action === 'update') {
      if (input.content === undefined || input.content.length === 0) {
        throw createApiServiceError('content is required to update a message.', {
          reason: 'microsoft_teams_message_content_missing'
        });
      }
      let body = buildMessagePayload({
        content: input.content,
        contentType: input.contentType,
        mentions: input.mentions,
        importance: input.importance
      });

      if (input.chatId) {
        await client.updateChatMessage(input.chatId, input.messageId, body);
      } else {
        // A reply is addressed under its thread root.
        await client.updateChannelMessage(
          input.teamId!,
          input.channelId!,
          input.parentMessageId ?? input.messageId,
          body,
          input.parentMessageId ? input.messageId : undefined
        );
      }

      return {
        output: {
          messageId: input.messageId,
          ...target,
          action: 'update' as const,
          success: true
        },
        message: `Message \`${input.messageId}\` updated.`
      };
    }

    if (input.chatId) {
      let me = await client.getMe();
      await client.softDeleteChatMessage(me.id, input.chatId, input.messageId);
    } else {
      await client.softDeleteChannelMessage(
        input.teamId!,
        input.channelId!,
        input.parentMessageId ?? input.messageId,
        input.parentMessageId ? input.messageId : undefined
      );
    }

    return {
      output: {
        messageId: input.messageId,
        ...target,
        action: 'delete' as const,
        success: true
      },
      message: `Message \`${input.messageId}\` deleted.`
    };
  })
  .build();
