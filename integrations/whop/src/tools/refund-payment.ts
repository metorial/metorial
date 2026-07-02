import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

export let refundPayment = SlateTool.create(spec, {
  name: 'Refund Payment',
  key: 'refund_payment',
  description: `Issue a full or partial refund for a Whop payment. Omit partialAmount for a full refund, or specify an amount for a partial refund.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      paymentId: z.string().describe('Payment ID to refund'),
      partialAmount: z
        .number()
        .optional()
        .describe('Amount to refund (in the payment currency). Omit for a full refund.')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      status: z.string().describe('Updated payment status'),
      refundedAmount: z.number().describe('Total refunded amount'),
      total: z.number().describe('Original payment total'),
      currency: z.string().describe('Currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let p = await client.refundPayment(ctx.input.paymentId, ctx.input.partialAmount);

    return {
      output: {
        paymentId: p.id,
        status: p.status,
        refundedAmount: p.refunded_amount || 0,
        total: p.total,
        currency: p.currency
      },
      message: `Refunded ${ctx.input.partialAmount ? `${p.currency.toUpperCase()} ${ctx.input.partialAmount}` : 'full amount'} for payment \`${p.id}\`.`
    };
  })
  .build();
