import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ticketSchema } from '../lib/types';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a single support ticket by its ID, including all details such as subject, requester, assignee, labels, content, and status flags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to retrieve')
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let ticket = await client.getTicket(ctx.input.ticketId);

    return {
      output: ticket,
      message: `Retrieved ticket **#${ticket.ticketId}**: "${ticket.subject}"`
    };
  })
  .build();
