import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

let moneyInputSchema = z.object({
  amount: z
    .number()
    .describe('Amount in smallest currency denomination (e.g., cents for USD)'),
  currency: z.string().describe('Currency code, e.g., USD')
});

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Create a new payment using a payment source (nonce, card on file, etc.). Supports setting amount, tip, customer, location, and delayed capture.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      sourceId: z.string().describe('Payment source ID (card nonce, card on file ID, etc.)'),
      amountMoney: moneyInputSchema.describe('The payment amount'),
      tipMoney: moneyInputSchema.optional().describe('Optional tip amount'),
      appFeeMoney: moneyInputSchema.optional().describe('Optional application fee amount'),
      appFeeAllocations: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Optional Square app_fee_allocations entries for distributing an application fee'
        ),
      customerId: z.string().optional().describe('Customer ID to associate with the payment'),
      locationId: z.string().optional().describe('Location ID for the payment'),
      orderId: z.string().optional().describe('Order ID to associate with the payment'),
      referenceId: z.string().optional().describe('Your custom reference ID for the payment'),
      note: z.string().optional().describe('A note for the payment (max 500 characters)'),
      autocomplete: z
        .boolean()
        .optional()
        .describe(
          'If false, the payment is only authorized and must be completed later. Defaults to true'
        ),
      delayDuration: z
        .string()
        .optional()
        .describe('Duration to delay capture, e.g., "PT36H" for 36 hours'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate payments. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional(),
      status: z.string().optional(),
      totalMoney: z
        .object({
          amount: z.number().optional(),
          currency: z.string().optional()
        })
        .optional(),
      receiptUrl: z.string().optional(),
      orderId: z.string().optional(),
      createdAt: z.string().optional(),
      appFeeMoney: z
        .object({
          amount: z.number().optional(),
          currency: z.string().optional()
        })
        .optional(),
      appFeeAllocations: z.array(z.record(z.string(), z.any())).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let p = await client.createPayment({
      sourceId: ctx.input.sourceId,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      amountMoney: ctx.input.amountMoney,
      tipMoney: ctx.input.tipMoney,
      appFeeMoney: ctx.input.appFeeMoney,
      appFeeAllocations: ctx.input.appFeeAllocations,
      customerId: ctx.input.customerId,
      locationId: ctx.input.locationId,
      orderId: ctx.input.orderId,
      referenceId: ctx.input.referenceId,
      note: ctx.input.note,
      autocomplete: ctx.input.autocomplete,
      delayDuration: ctx.input.delayDuration
    });

    return {
      output: {
        paymentId: p.id,
        status: p.status,
        totalMoney: p.total_money,
        receiptUrl: p.receipt_url,
        orderId: p.order_id,
        createdAt: p.created_at,
        appFeeMoney: p.app_fee_money,
        appFeeAllocations: p.app_fee_allocations
      },
      message: `Payment **${p.id}** created with status **${p.status}**.`
    };
  })
  .build();
