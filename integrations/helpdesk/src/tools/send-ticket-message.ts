import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTicketMessage = SlateTool.create(spec, {
  name: 'Send Ticket Message',
  key: 'send_ticket_message',
  description:
    'Add a plain-text public reply or private internal note to an existing HelpDesk ticket.',
  instructions: [
    'Public messages are visible to the requester. Set isPrivate to true for an internal note.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ticketId: z.string().describe('Ticket ID returned by list_tickets or get_ticket'),
      text: z.string().min(1).describe('Plain-text message content'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Whether this message is a private internal note (defaults to false)'),
      cannedResponseIDs: z
        .array(z.string())
        .optional()
        .describe('IDs of canned responses used in the message')
    })
  )
  .output(z.object({ ticketId: z.string(), shortID: z.string(), isPrivate: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let ticket = await client.updateTicket(ctx.input.ticketId, {
      message: { text: ctx.input.text, cannedResponseIDs: ctx.input.cannedResponseIDs },
      isPrivate: ctx.input.isPrivate ?? false
    });
    return {
      output: {
        ticketId: ticket.id,
        shortID: ticket.shortID,
        isPrivate: ctx.input.isPrivate ?? false
      },
      message: `Added ${ctx.input.isPrivate ? 'an internal note' : 'a public reply'} to ticket **${ticket.shortID}**.`
    };
  })
  .build();
