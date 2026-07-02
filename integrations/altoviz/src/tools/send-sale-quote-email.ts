import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSaleQuoteEmail = SlateTool.create(spec, {
  name: 'Send Sale Quote by Email',
  key: 'send_sale_quote_email',
  description: `Send a sales quote to the customer by email through the Altoviz platform.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      quoteId: z.number().describe('Altoviz quote ID to send')
    })
  )
  .output(
    z.object({
      sent: z.boolean(),
      quoteId: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.sendSaleQuoteByEmail(ctx.input.quoteId);
    return {
      output: { sent: true, quoteId: ctx.input.quoteId },
      message: `Quote **${ctx.input.quoteId}** sent by email.`
    };
  })
  .build();
