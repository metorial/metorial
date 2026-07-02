import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let addTicketThread = SlateTool.create(spec, {
  name: 'Reply to Ticket',
  key: 'add_ticket_thread',
  description: `Send an email reply on a ticket. Creates a new thread (email conversation entry) on the ticket. Use this to respond to the customer or forward the ticket.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket to reply to'),
      to: z.string().describe('Recipient email address'),
      content: z.string().describe('Reply content (HTML supported)'),
      cc: z.string().optional().describe('CC email addresses, comma-separated'),
      bcc: z.string().optional().describe('BCC email addresses, comma-separated'),
      isForward: z
        .boolean()
        .optional()
        .describe('Whether this is a forward instead of a reply'),
      channel: z.string().optional().describe('Channel for the thread (defaults to EMAIL)'),
      contentType: z
        .enum(['html', 'plainText'])
        .optional()
        .describe('Content type of the reply')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the created thread'),
      direction: z.string().optional().describe('Direction of the thread (in/out)'),
      channel: z.string().optional().describe('Channel of the thread'),
      createdTime: z.string().optional().describe('Time the thread was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let threadData: Record<string, any> = {
      to: ctx.input.to,
      content: ctx.input.content
    };
    if (ctx.input.cc) threadData.cc = ctx.input.cc;
    if (ctx.input.bcc) threadData.bcc = ctx.input.bcc;
    if (ctx.input.isForward) threadData.isForward = ctx.input.isForward;
    if (ctx.input.channel) threadData.channel = ctx.input.channel;
    if (ctx.input.contentType) threadData.contentType = ctx.input.contentType;

    let result = await client.addTicketThread(ctx.input.ticketId, threadData);

    return {
      output: {
        threadId: result.id,
        direction: result.direction,
        channel: result.channel,
        createdTime: result.createdTime
      },
      message: `Sent reply on ticket **${ctx.input.ticketId}** to ${ctx.input.to}`
    };
  })
  .build();
