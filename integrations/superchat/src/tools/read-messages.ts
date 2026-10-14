import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('Message ID'),
  conversationId: z.string().describe('Conversation ID'),
  direction: z.string().describe('Message direction'),
  status: z.string().optional().nullable().describe('Delivery status when available'),
  content: z.record(z.string(), z.any()).describe('Message content'),
  from: z.record(z.string(), z.any()).describe('Sender details'),
  to: z.array(z.record(z.string(), z.any())).describe('Recipient details'),
  inReplyTo: z.string().optional().nullable().describe('Original message ID for a reply'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  messageUrl: z.string().optional().describe('Message resource URL')
});

let mapMessage = (message: any) => ({
  messageId: message.id,
  conversationId: message.conversation_id,
  direction: message.direction,
  status: message.status,
  content: message.content,
  from: message.from,
  to: Array.isArray(message.to) ? message.to : [message.to],
  inReplyTo: message.in_reply_to,
  createdAt: message.created_at,
  updatedAt: message.updated_at,
  messageUrl: message.url
});

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Read an inbound or outbound message, including its content, sender, recipients, and conversation ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      messageId: z
        .string()
        .describe('Message ID from send_message or list_conversation_messages')
    })
  )
  .output(messageSchema)
  .handleInvocation(async ctx => {
    let message = await new SuperchatClient(ctx.auth).getMessage(ctx.input.messageId);
    return {
      output: mapMessage(message),
      message: `Retrieved message \`${message.id}\`.`
    };
  })
  .build();

export let listConversationMessages = SlateTool.create(spec, {
  name: 'List Conversation Messages',
  key: 'list_conversation_messages',
  description:
    'Read a conversation history with cursor pagination and optional timestamp or direction filters. Call list_conversations to discover conversation IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z.string().describe('Conversation ID from list_conversations'),
      limit: z.number().optional().describe('Whole number between 1 and 100; defaults to 20'),
      after: z
        .string()
        .optional()
        .describe('Return messages after this message ID; cannot be combined with before'),
      before: z
        .string()
        .optional()
        .describe('Return messages before this message ID; cannot be combined with after'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only messages created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only messages created before this ISO 8601 timestamp'),
      direction: z
        .enum(['INBOUND', 'OUTBOUND'])
        .optional()
        .describe('Only messages with this direction')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('Messages in this page'),
      pagination: z
        .object({
          next: z.string().nullable().optional().describe('Pass to after for the next page'),
          previous: z
            .string()
            .nullable()
            .optional()
            .describe('Pass to before for the previous page')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new SuperchatClient(ctx.auth).getConversationMessages(
      ctx.input.conversationId,
      ctx.input
    );
    let messages = (result.results ?? []).map(mapMessage);
    return {
      output: { messages, pagination: result.pagination },
      message: `Retrieved **${messages.length}** message(s) from conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();
