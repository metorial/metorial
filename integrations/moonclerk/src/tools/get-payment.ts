import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paymentSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getPaymentTool = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Retrieve a specific payment by its ID. Returns full payment details including amount, status, payer information, payment source, custom fields, and coupon data.`,
  instructions: ['All amounts are in cents (e.g. 1000 = $10.00).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paymentId: z.number().describe('MoonClerk payment ID')
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let payment = await client.getPayment(ctx.input.paymentId);

    return {
      output: payment,
      message: `Retrieved payment **#${payment.paymentId}** — ${payment.status}, ${payment.amount} ${payment.currency} from **${payment.name}** (${payment.email}).`
    };
  })
  .build();
