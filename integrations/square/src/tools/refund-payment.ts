import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let refundPayment = SlateTool.create(spec, {
  name: 'Refund Payment',
  key: 'refund_payment',
  description: `Issue a full or partial refund for a Square payment. Specify the payment ID and the amount to refund. Optionally provide a reason for the refund.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      paymentId: z.string().describe('ID of the payment to refund'),
      amountMoney: z
        .object({
          amount: z.number().describe('Refund amount in smallest currency denomination'),
          currency: z.string().describe('Currency code, e.g., USD')
        })
        .describe('Amount to refund'),
      appFeeMoney: z
        .object({
          amount: z.number().describe('Application fee amount to refund'),
          currency: z.string().describe('Currency code, e.g., USD')
        })
        .optional()
        .describe('Optional application fee amount to refund'),
      appFeeAllocations: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Optional Square app_fee_allocations entries for fee-allocation refunds'),
      reason: z.string().optional().describe('Reason for the refund'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate refunds. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      refundId: z.string().optional(),
      status: z.string().optional(),
      amountMoney: z
        .object({
          amount: z.number().optional(),
          currency: z.string().optional()
        })
        .optional(),
      paymentId: z.string().optional(),
      orderId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let r = await client.refundPayment({
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      paymentId: ctx.input.paymentId,
      amountMoney: ctx.input.amountMoney,
      appFeeMoney: ctx.input.appFeeMoney,
      appFeeAllocations: ctx.input.appFeeAllocations,
      reason: ctx.input.reason
    });

    return {
      output: {
        refundId: r.id,
        status: r.status,
        amountMoney: r.amount_money,
        paymentId: r.payment_id,
        orderId: r.order_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      },
      message: `Refund **${r.id}** created for payment **${r.payment_id}**. Status: **${r.status}**`
    };
  })
  .build();
