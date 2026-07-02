import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendRatingRequest = SlateTool.create(spec, {
  name: 'Send Rating Request',
  key: 'send_rating_request',
  description: `Send a customer satisfaction rating request email to the requester of a HelpDesk ticket. The requester will receive an email allowing them to rate their support experience as good, neutral, or bad, with an optional comment.`,
  instructions: [
    'The ticket should typically be in "solved" or "closed" status before sending a rating request.',
    'A rating request email will be sent to the ticket requester.',
    'Each ticket can only have one rating; sending a new request allows the customer to update their rating.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The unique ID of the ticket to send a rating request for')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the rating request was successfully sent'),
      ticketId: z.string().describe('The ID of the ticket the rating request was sent for')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendRatingRequest(ctx.input.ticketId);

    return {
      output: {
        success: true,
        ticketId: ctx.input.ticketId
      },
      message: `Successfully sent a rating request for ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
