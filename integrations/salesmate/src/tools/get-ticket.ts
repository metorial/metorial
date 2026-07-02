import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a support ticket by its ID from Salesmate. Returns all fields including status, priority, and associated contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket to retrieve')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.unknown()).describe('Full ticket record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getTicket(ctx.input.ticketId);
    let ticket = result?.Data ?? result;

    return {
      output: { ticket },
      message: `Retrieved ticket \`${ctx.input.ticketId}\`.`
    };
  })
  .build();
