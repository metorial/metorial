import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { mapRefund, moneyInputSchema, refundOutputSchema } from './payment-shared';

export let refundPayment = SlateTool.create(spec, {
  name: 'Refund Payment',
  key: 'refund_payment',
  description:
    'Issue a full or partial refund of a completed Square payment. A payment can have no more than 20 refunds.',
  tags: { destructive: false }
})
  .scopes(allOf('PAYMENTS_WRITE'))
  .input(
    z.object({
      paymentId: z.string().describe('Completed payment ID'),
      amountMoney: moneyInputSchema.extend({ amount: z.number().int().safe().positive() }),
      appFeeMoney: moneyInputSchema
        .optional()
        .describe(
          'Application fee amount to refund; requires PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'
        ),
      appFeeAllocations: z
        .array(z.record(z.string(), z.any()))
        .max(2)
        .optional()
        .describe(
          'Application fee allocations to refund; requires PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'
        ),
      paymentVersionToken: z
        .string()
        .optional()
        .describe('Current payment version token from get_payment for optimistic concurrency'),
      reason: z.string().max(192).optional(),
      idempotencyKey: z
        .string()
        .min(1)
        .max(45)
        .optional()
        .describe('Unique retry key; supply one when retrying an uncertain refund')
    })
  )
  .output(refundOutputSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.appFeeMoney || ctx.input.appFeeAllocations) {
      requireSquareScopes(ctx.auth, ['PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS']);
    }
    let refund = await createClient(ctx.auth).refundPayment({
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      paymentId: ctx.input.paymentId,
      amountMoney: ctx.input.amountMoney,
      appFeeMoney: ctx.input.appFeeMoney,
      appFeeAllocations: ctx.input.appFeeAllocations,
      paymentVersionToken: ctx.input.paymentVersionToken,
      reason: ctx.input.reason
    });
    return {
      output: mapRefund(refund),
      message: `Refund **${refund.id}** created for payment **${refund.payment_id}**. Status: **${refund.status}**`
    };
  })
  .build();
