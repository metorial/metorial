import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePayment = SlateTool.create(spec, {
  name: 'Manage Payment',
  key: 'manage_payment',
  description: `Complete or cancel an existing payment. Use "complete" to capture a previously authorized (delayed) payment, or "cancel" to void it.`
})
  .input(
    z.object({
      paymentId: z.string().describe('The ID of the payment to manage'),
      action: z.enum(['complete', 'cancel']).describe('Action to perform on the payment')
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional(),
      status: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let p =
      ctx.input.action === 'complete'
        ? await client.completePayment(ctx.input.paymentId)
        : await client.cancelPayment(ctx.input.paymentId);

    return {
      output: {
        paymentId: p.id,
        status: p.status,
        updatedAt: p.updated_at
      },
      message: `Payment **${p.id}** ${ctx.input.action === 'complete' ? 'completed' : 'canceled'}. Status: **${p.status}**`
    };
  })
  .build();
