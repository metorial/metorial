import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { formatMoney, mapPayment, paymentOutputSchema } from './payment-shared';

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description:
    'Get a payment by ID, including current status, version token, refund IDs, card or cash details, and receipt URL.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYMENTS_READ'))
  .input(z.object({ paymentId: z.string().describe('Payment ID') }))
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    let p = await createClient(ctx.auth).getPayment(ctx.input.paymentId);
    return {
      output: mapPayment(p),
      message: `Payment **${p.id}** — Status: **${p.status}**, Amount: ${formatMoney(p.total_money)}`
    };
  })
  .build();
