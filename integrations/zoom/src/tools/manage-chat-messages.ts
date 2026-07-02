import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { zoomServiceError } from '../lib/errors';
import { spec } from '../spec';

let mapChatMessage = (message: any) => ({
  messageId: message.id,
  message: message.message,
  sender: message.sender,
  senderDisplayName: message.sender_display_name,
  sendMemberId: message.send_member_id,
  dateTime: message.date_time,
  timestamp: message.timestamp,
  messageUrl: message.message_url,
  messageType: message.message_type,
  files: message.files,
  reactions: message.reactions,
  replyMainMessageId: message.reply_main_message_id
});

let assertRecipient = (toChannel?: string, toContact?: string) => {
  if (!toChannel && !toContact) {
    throw zoomServiceError('Provide either toChannel or toContact for chat message actions.');
  }

  if (toChannel && toContact) {
    throw zoomServiceError('Provide only one chat recipient: toChannel or toContact.');
  }
};

export let manageChatMessages = SlateTool.create(spec, {
  name: 'Manage Chat Messages',
  key: 'manage_chat_messages',
  description:
    'List, retrieve, update, or delete Zoom Team Chat messages in a channel or direct conversation.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'update', 'delete'])
        .describe('Chat message action to perform'),
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      messageId: z.string().optional().describe('Message ID for get, update, or delete'),
      message: z.string().max(1024).optional().describe('Updated message text'),
      toChannel: z.string().optional().describe('Channel ID for the conversation'),
      toContact: z
        .string()
        .optional()
        .describe('Contact email, user ID, or member ID for a direct conversation'),
      date: z.string().optional().describe('Message date to list (YYYY-MM-DD)'),
      from: z
        .string()
        .optional()
        .describe('Start date-time for listing messages (yyyy-MM-ddTHH:mm:ssZ)'),
      to: z
        .string()
        .optional()
        .describe('End date-time for listing messages (yyyy-MM-ddTHH:mm:ssZ)'),
      pageSize: z.number().optional().describe('Number of records per page (max 50)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page'),
      includeDeletedAndEditedMessage: z
        .boolean()
        .optional()
        .describe('Include deleted and edited messages when listing')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the mutation succeeded'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      messages: z
        .array(
          z.object({
            messageId: z.string().optional().describe('Message ID'),
            message: z.string().optional().describe('Message text'),
            sender: z.string().optional().describe('Sender ID or email'),
            senderDisplayName: z.string().optional().describe('Sender display name'),
            sendMemberId: z.string().optional().describe('Sender member ID'),
            dateTime: z.string().optional().describe('Message date-time'),
            timestamp: z.number().optional().describe('Message timestamp'),
            messageUrl: z.string().optional().describe('Message URL'),
            messageType: z.string().optional().describe('Message type'),
            files: z.any().optional().describe('Attached files'),
            reactions: z.any().optional().describe('Message reactions'),
            replyMainMessageId: z.string().optional().describe('Parent thread message ID')
          })
        )
        .optional()
        .describe('Messages returned by list'),
      chatMessage: z
        .object({
          messageId: z.string().optional().describe('Message ID'),
          message: z.string().optional().describe('Message text'),
          sender: z.string().optional().describe('Sender ID or email'),
          senderDisplayName: z.string().optional().describe('Sender display name'),
          sendMemberId: z.string().optional().describe('Sender member ID'),
          dateTime: z.string().optional().describe('Message date-time'),
          timestamp: z.number().optional().describe('Message timestamp'),
          messageUrl: z.string().optional().describe('Message URL'),
          messageType: z.string().optional().describe('Message type'),
          files: z.any().optional().describe('Attached files'),
          reactions: z.any().optional().describe('Message reactions'),
          replyMainMessageId: z.string().optional().describe('Parent thread message ID')
        })
        .optional()
        .describe('Message returned by get or update')
    })
  )
  .handleInvocation(async ctx => {
    assertRecipient(ctx.input.toChannel, ctx.input.toContact);

    let client = new ZoomClient(ctx.auth.token);
    let recipient = ctx.input.toChannel
      ? `channel ${ctx.input.toChannel}`
      : `contact ${ctx.input.toContact}`;

    if (ctx.input.action === 'list') {
      let result = await client.listChatMessages(ctx.input.userId, {
        toChannel: ctx.input.toChannel,
        toContact: ctx.input.toContact,
        date: ctx.input.date,
        from: ctx.input.from,
        to: ctx.input.to,
        pageSize: ctx.input.pageSize,
        nextPageToken: ctx.input.nextPageToken,
        includeDeletedAndEditedMessage: ctx.input.includeDeletedAndEditedMessage
      });
      let messages = (result.messages || []).map(mapChatMessage);

      return {
        output: {
          nextPageToken: result.next_page_token || undefined,
          messages
        },
        message: `Found **${messages.length}** message(s) for ${recipient}.`
      };
    }

    if (!ctx.input.messageId) {
      throw zoomServiceError(`messageId is required to ${ctx.input.action} a chat message.`);
    }

    if (ctx.input.action === 'get') {
      let message = await client.getChatMessage(ctx.input.messageId, ctx.input.userId, {
        toChannel: ctx.input.toChannel,
        toContact: ctx.input.toContact
      });

      return {
        output: {
          chatMessage: mapChatMessage(message)
        },
        message: `Retrieved message **${ctx.input.messageId}** from ${recipient}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteChatMessage(ctx.input.messageId, ctx.input.userId, {
        toChannel: ctx.input.toChannel,
        toContact: ctx.input.toContact
      });

      return {
        output: { success: true },
        message: `Deleted message **${ctx.input.messageId}** from ${recipient}.`
      };
    }

    if (!ctx.input.message) {
      throw zoomServiceError('message is required to update a chat message.');
    }

    await client.updateChatMessage(ctx.input.messageId, ctx.input.userId, {
      message: ctx.input.message,
      toChannel: ctx.input.toChannel,
      toContact: ctx.input.toContact
    });
    let updated = await client.getChatMessage(ctx.input.messageId, ctx.input.userId, {
      toChannel: ctx.input.toChannel,
      toContact: ctx.input.toContact
    });

    return {
      output: {
        success: true,
        chatMessage: mapChatMessage(updated)
      },
      message: `Updated message **${ctx.input.messageId}** in ${recipient}.`
    };
  })
  .build();
