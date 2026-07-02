import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('The message ID'),
  channelId: z.string().describe('The channel ID the message belongs to'),
  content: z.string().describe('The text content of the message'),
  authorUsername: z.string().describe('The username of the message author'),
  authorId: z.string().describe('The user ID of the message author'),
  timestamp: z.string().describe('ISO 8601 timestamp of when the message was created')
});

let formatMessage = (msg: any, channelId: string) => ({
  messageId: msg.id,
  channelId: channelId,
  content: msg.content ?? '',
  authorUsername: msg.author?.username ?? '',
  authorId: msg.author?.id ?? '',
  timestamp: msg.timestamp ?? ''
});

export let manageMessages = SlateTool.create(spec, {
  name: 'Manage Messages',
  key: 'manage_messages',
  description: `Manage messages in a Discord channel. Supports listing messages, getting a specific message, editing, deleting, pinning/unpinning, listing pinned messages, and bulk deleting messages.`,
  instructions: [
    'Use action "list" to fetch recent messages from a channel. Supports pagination with before, after, and around parameters.',
    'Use action "get" to retrieve a single message by its ID.',
    'Use action "edit" to modify the content of a message. Only messages authored by the bot can be edited.',
    'Use action "delete" to remove a single message from a channel.',
    'Use action "pin" or "unpin" to pin or unpin a message in a channel.',
    'Use action "list_pinned" to get all currently pinned messages in a channel.',
    'Use action "bulk_delete" to delete multiple messages at once (2-100 messages, must be less than 14 days old).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageMessages)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'edit', 'delete', 'pin', 'unpin', 'bulk_delete', 'list_pinned'])
        .describe('The message action to perform'),
      channelId: z.string().describe('The channel ID to operate in'),
      messageId: z
        .string()
        .optional()
        .describe('The message ID (required for get, edit, delete, pin, unpin)'),
      content: z.string().optional().describe('New message content (required for edit)'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of messages to retrieve, 1-100 (for list action, defaults to 50)'
        ),
      before: z
        .string()
        .optional()
        .describe('Get messages before this message ID (for list action)'),
      after: z
        .string()
        .optional()
        .describe('Get messages after this message ID (for list action)'),
      around: z
        .string()
        .optional()
        .describe('Get messages around this message ID (for list action)'),
      messageIds: z
        .array(z.string())
        .optional()
        .describe('Array of message IDs to delete (required for bulk_delete, 2-100 IDs)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      message: messageSchema
        .optional()
        .describe('The message object (for get, edit, pin, unpin actions)'),
      messages: z
        .array(messageSchema)
        .optional()
        .describe('Array of message objects (for list, list_pinned actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action, channelId, messageId } = ctx.input;

    if (action === 'list') {
      let rawMessages = await client.getMessages(channelId, {
        limit: ctx.input.limit,
        before: ctx.input.before,
        after: ctx.input.after,
        around: ctx.input.around
      });
      let messages = rawMessages.map((msg: any) => formatMessage(msg, channelId));
      return {
        output: { success: true, messages },
        message: `Retrieved ${messages.length} message(s) from channel \`${channelId}\`.`
      };
    }

    if (action === 'get') {
      if (!messageId) throw discordServiceError('messageId is required for get action');
      let raw = await client.getMessage(channelId, messageId);
      let formatted = formatMessage(raw, channelId);
      return {
        output: { success: true, message: formatted },
        message: `Retrieved message \`${messageId}\` from channel \`${channelId}\`.`
      };
    }

    if (action === 'edit') {
      if (!messageId) throw discordServiceError('messageId is required for edit action');
      if (!ctx.input.content) throw discordServiceError('content is required for edit action');
      let raw = await client.editMessage(channelId, messageId, { content: ctx.input.content });
      let formatted = formatMessage(raw, channelId);
      return {
        output: { success: true, message: formatted },
        message: `Edited message \`${messageId}\` in channel \`${channelId}\`.`
      };
    }

    if (action === 'delete') {
      if (!messageId) throw discordServiceError('messageId is required for delete action');
      await client.deleteMessage(channelId, messageId);
      return {
        output: { success: true },
        message: `Deleted message \`${messageId}\` from channel \`${channelId}\`.`
      };
    }

    if (action === 'pin') {
      if (!messageId) throw discordServiceError('messageId is required for pin action');
      await client.pinMessage(channelId, messageId);
      let raw = await client.getMessage(channelId, messageId);
      let formatted = formatMessage(raw, channelId);
      return {
        output: { success: true, message: formatted },
        message: `Pinned message \`${messageId}\` in channel \`${channelId}\`.`
      };
    }

    if (action === 'unpin') {
      if (!messageId) throw discordServiceError('messageId is required for unpin action');
      await client.unpinMessage(channelId, messageId);
      let raw = await client.getMessage(channelId, messageId);
      let formatted = formatMessage(raw, channelId);
      return {
        output: { success: true, message: formatted },
        message: `Unpinned message \`${messageId}\` in channel \`${channelId}\`.`
      };
    }

    if (action === 'bulk_delete') {
      if (!ctx.input.messageIds || ctx.input.messageIds.length < 2) {
        throw discordServiceError(
          'messageIds must contain at least 2 message IDs for bulk_delete action'
        );
      }
      if (ctx.input.messageIds.length > 100) {
        throw discordServiceError(
          'messageIds must contain at most 100 message IDs for bulk_delete action'
        );
      }
      await client.bulkDeleteMessages(channelId, ctx.input.messageIds);
      return {
        output: { success: true },
        message: `Bulk deleted ${ctx.input.messageIds.length} message(s) from channel \`${channelId}\`.`
      };
    }

    // list_pinned
    let rawPinned = await client.getPinnedMessages(channelId);
    let messages = rawPinned.map((msg: any) => formatMessage(msg, channelId));
    return {
      output: { success: true, messages },
      message: `Found ${messages.length} pinned message(s) in channel \`${channelId}\`.`
    };
  })
  .build();
