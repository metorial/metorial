import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageUid: z.string().describe('Unique message identifier'),
  chatId: z.number().optional().describe('Chat ID this message belongs to'),
  timestamp: z.string().optional().describe('Message timestamp'),
  senderPhone: z.string().optional().describe('Sender phone number'),
  senderName: z.string().optional().describe('Sender display name'),
  recipientPhone: z.string().optional().describe('Recipient phone number'),
  recipientName: z.string().optional().describe('Recipient display name'),
  fromMe: z.boolean().optional().describe('Whether the message was sent by my account'),
  text: z.string().optional().describe('Message text content'),
  attachmentUrl: z.string().optional().describe('Attachment download URL'),
  attachmentFilename: z.string().optional().describe('Attachment filename'),
  hasAttachment: z.boolean().optional().describe('Whether the message has an attachment'),
  status: z.string().optional().describe('Message delivery status'),
  messageType: z.string().optional().describe('Type of message (e.g., Note)')
});

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve message history for a specific chat. Supports filtering by direction (sent/received), date range, and message UID-based cursors. Can also retrieve details and delivery status history for a single message by UID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatId: z.number().optional().describe('Chat ID to retrieve message history for'),
      messageUid: z.string().optional().describe('Specific message UID to get details for'),
      fromMe: z
        .boolean()
        .optional()
        .describe('Filter sent (true) or received (false) messages'),
      after: z
        .string()
        .optional()
        .describe('Filter messages created after this ISO datetime (inclusive)'),
      before: z
        .string()
        .optional()
        .describe('Filter messages created before this ISO datetime (inclusive)'),
      afterMessage: z
        .string()
        .optional()
        .describe('Filter messages after this message UID (exclusive)'),
      beforeMessage: z
        .string()
        .optional()
        .describe('Filter messages before this message UID (exclusive)'),
      sortingOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort by timestamp ascending or descending'),
      includeStatusHistory: z
        .boolean()
        .optional()
        .describe('When retrieving a single message, also include its delivery status history')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages'),
      hasMorePages: z.boolean().optional().describe('Whether more pages are available'),
      statusHistory: z
        .array(
          z.object({
            status: z.string().describe('Status name'),
            timestamp: z.string().describe('Status timestamp')
          })
        )
        .optional()
        .describe(
          'Delivery status history (only when retrieving a single message with includeStatusHistory)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.messageUid) {
      let msgResult = await client.getMessage(ctx.input.messageUid);
      let msg = msgResult?.data || msgResult;

      let statusHistory: any[] | undefined;
      if (ctx.input.includeStatusHistory) {
        let histResult = await client.getMessageStatusHistory(ctx.input.messageUid);
        statusHistory = (histResult?.data || []).map((s: any) => ({
          status: s.status,
          timestamp: s.timestamp
        }));
      }

      let mapped = {
        messageUid: msg.uid,
        chatId: msg.chat_id,
        timestamp: msg.timestamp,
        senderPhone: msg.sender_phone,
        senderName: msg.sender_name,
        recipientPhone: msg.recipient_phone,
        recipientName: msg.recipient_name,
        fromMe: msg.from_me,
        text: msg.text,
        attachmentUrl: msg.attachment_url,
        attachmentFilename: msg.attachment_filename,
        hasAttachment: msg.has_attachment,
        status: msg.status,
        messageType: msg.message_type
      };

      return {
        output: {
          messages: [mapped],
          hasMorePages: false,
          statusHistory
        },
        message: `Retrieved message **${msg.uid}**${statusHistory ? ` with ${statusHistory.length} status entries` : ''}.`
      };
    }

    if (!ctx.input.chatId) {
      throw new Error('Either chatId or messageUid must be provided');
    }

    let result = await client.getChatMessages(ctx.input.chatId, {
      fromMe: ctx.input.fromMe,
      after: ctx.input.after,
      before: ctx.input.before,
      afterMessage: ctx.input.afterMessage,
      beforeMessage: ctx.input.beforeMessage,
      sortingOrder: ctx.input.sortingOrder
    });

    let messages = (result?.data?.messages || []).map((msg: any) => ({
      messageUid: msg.uid,
      chatId: msg.chat_id,
      timestamp: msg.timestamp,
      senderPhone: msg.sender_phone,
      senderName: msg.sender_name,
      recipientPhone: msg.recipient_phone,
      recipientName: msg.recipient_name,
      fromMe: msg.from_me,
      text: msg.text,
      attachmentUrl: msg.attachment_url,
      attachmentFilename: msg.attachment_filename,
      hasAttachment: msg.has_attachment,
      status: msg.status,
      messageType: msg.message_type
    }));

    let hasMorePages = result?.data?.has_more_pages || false;

    return {
      output: { messages, hasMorePages },
      message: `Retrieved **${messages.length}** message(s) from chat ${ctx.input.chatId}${hasMorePages ? ' (more pages available)' : ''}.`
    };
  })
  .build();
