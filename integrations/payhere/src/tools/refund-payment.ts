import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let refundPayment = SlateTool.create(spec, {
  name: 'Refund Payment',
  key: 'refund_payment',
  description: `Issue a full or partial refund for an existing payment. Requires specifying the payment, amount to refund, and a reason.`,
  constraints: [
    'The refund amount cannot exceed the original payment amount.',
    'Refunds are processed through the original payment provider (Stripe or GoCardless).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentId: z.number().describe('ID of the payment to refund'),
      amount: z
        .number()
        .describe('Amount to refund in the original currency (e.g. 1.50 for $1.50)'),
      reason: z
        .enum(['requested_by_customer', 'duplicate', 'fraudulent'])
        .describe('Reason for the refund')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('ID of the refunded payment'),
      refunded: z.boolean().describe('Whether the refund was successful'),
      amount: z.number().describe('Amount refunded'),
      reason: z.string().describe('Reason for refund')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    await client.createRefund({
      paymentId: ctx.input.paymentId,
      amount: ctx.input.amount,
      reason: ctx.input.reason
    });

    return {
      output: {
        paymentId: ctx.input.paymentId,
        refunded: true,
        amount: ctx.input.amount,
        reason: ctx.input.reason
      },
      message: `Refunded **${ctx.input.amount}** for payment **#${ctx.input.paymentId}** (reason: ${ctx.input.reason.replace(/_/g, ' ')}).`
    };
  })
  .build();
