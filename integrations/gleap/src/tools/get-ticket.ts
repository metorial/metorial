import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a single support ticket by its ID, including all metadata, status, priority, assignment, and content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ID of the ticket to retrieve')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('The full ticket object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let ticket = await client.getTicket(ctx.input.ticketId);

    return {
      output: { ticket },
      message: `Retrieved ticket **${ticket.title || ctx.input.ticketId}**.`
    };
  })
  .build();
