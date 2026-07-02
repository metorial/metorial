import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve the message history for a specific contact. Returns messages sent and received across all connected channels, with cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve messages for'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of messages to return (1-100)'),
      cursorId: z
        .string()
        .optional()
        .describe('Cursor ID for pagination from a previous response')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID'),
            type: z.string().optional().describe('Message type (text, attachment, etc.)'),
            text: z.string().optional().describe('Text content of the message'),
            direction: z
              .string()
              .optional()
              .describe('Message direction (incoming or outgoing)'),
            channelId: z.string().optional().describe('Channel the message was sent through'),
            createdAt: z.string().optional().describe('Message timestamp'),
            status: z.string().optional().describe('Delivery status')
          })
        )
        .describe('List of messages'),
      nextCursorId: z.string().optional().describe('Cursor ID for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessages(
      ctx.input.contactId,
      ctx.input.limit,
      ctx.input.cursorId
    );
    let data = result?.data || result;
    let messagesList = Array.isArray(data) ? data : data?.messages || data?.data || [];

    let messages = messagesList.map((m: any) => ({
      messageId: String(m.id || m.messageId || ''),
      type: m.type,
      text: m.text || m.message?.text,
      direction: m.direction,
      channelId: m.channelId ? String(m.channelId) : undefined,
      createdAt: m.createdAt,
      status: m.status
    }));

    return {
      output: {
        messages,
        nextCursorId: data?.cursorId || data?.nextCursorId
      },
      message: `Retrieved **${messages.length}** message(s) for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
