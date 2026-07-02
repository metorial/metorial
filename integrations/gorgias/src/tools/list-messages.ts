import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve all messages for a given ticket, ordered by sending date. Includes customer replies, agent responses, and internal notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to list messages for'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of messages to return')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.number().describe('Message ID'),
          channel: z.string().nullable().describe('Message channel'),
          fromAgent: z.boolean().describe('Whether the message is from an agent'),
          senderEmail: z.string().nullable().describe('Sender email'),
          receiverEmail: z.string().nullable().describe('Receiver email'),
          subject: z.string().nullable().describe('Message subject'),
          bodyText: z.string().nullable().describe('Plain text body'),
          bodyHtml: z.string().nullable().describe('HTML body'),
          createdDatetime: z.string().nullable().describe('When the message was created')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listMessages(ctx.input.ticketId, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let messages = result.data.map((m: any) => ({
      messageId: m.id,
      channel: m.channel || null,
      fromAgent: m.from_agent || false,
      senderEmail: m.sender?.email || null,
      receiverEmail: m.receiver?.email || null,
      subject: m.subject || null,
      bodyText: m.body_text || null,
      bodyHtml: m.body_html || null,
      createdDatetime: m.created_datetime || null
    }));

    return {
      output: {
        messages,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${messages.length}** message(s) in ticket **#${ctx.input.ticketId}**.`
    };
  })
  .build();
