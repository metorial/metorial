import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().optional().describe('Unique message identifier.'),
  conversationId: z.string().optional().describe('Conversation ID.'),
  ticketId: z.string().optional().describe('Ticket ID.'),
  eventType: z.string().optional().describe('Type of conversation event.'),
  created: z.string().optional().describe('Timestamp of the message.')
});

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve WhatsApp message history for a given contact or conversation. Returns a paginated list of messages.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z
        .string()
        .describe(
          'Conversation identifier: phone number with country code, conversation ID, or Channel:PhoneNumber.'
        ),
      pageNumber: z.number().int().min(1).default(1).describe('Page number (1-based).'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Number of messages per page (max 100).')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages.'),
      pageNumber: z.number().optional().describe('Current page number.'),
      pageSize: z.number().optional().describe('Items per page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result = await client.getMessages(ctx.input.target, {
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let messages = (result?.message_list || []).map((m: any) => ({
      messageId: m.id,
      conversationId: m.conversation_id,
      ticketId: m.ticket_id,
      eventType: m.event_type,
      created: m.created
    }));

    return {
      output: {
        messages,
        pageNumber: result?.page_number,
        pageSize: result?.page_size
      },
      message: `Retrieved **${messages.length}** messages for **${ctx.input.target}** (page ${ctx.input.pageNumber}).`
    };
  })
  .build();
