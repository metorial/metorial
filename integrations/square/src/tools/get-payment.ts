import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let moneySchema = z
  .object({
    amount: z.number().optional(),
    currency: z.string().optional()
  })
  .optional();

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Retrieve full details of a specific payment by its ID. Returns comprehensive payment information including amount, status, card details, and receipt URL.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      paymentId: z.string().describe('The ID of the payment to retrieve')
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional(),
      status: z.string().optional(),
      amountMoney: moneySchema,
      tipMoney: moneySchema,
      totalMoney: moneySchema,
      sourceType: z.string().optional(),
      cardBrand: z.string().optional(),
      cardLastFour: z.string().optional(),
      locationId: z.string().optional(),
      orderId: z.string().optional(),
      customerId: z.string().optional(),
      referenceId: z.string().optional(),
      note: z.string().optional(),
      receiptNumber: z.string().optional(),
      receiptUrl: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      delayAction: z.string().optional(),
      delayedUntil: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let p = await client.getPayment(ctx.input.paymentId);

    return {
      output: {
        paymentId: p.id,
        status: p.status,
        amountMoney: p.amount_money,
        tipMoney: p.tip_money,
        totalMoney: p.total_money,
        sourceType: p.source_type,
        cardBrand: p.card_details?.card?.card_brand,
        cardLastFour: p.card_details?.card?.last_4,
        locationId: p.location_id,
        orderId: p.order_id,
        customerId: p.customer_id,
        referenceId: p.reference_id,
        note: p.note,
        receiptNumber: p.receipt_number,
        receiptUrl: p.receipt_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        delayAction: p.delay_action,
        delayedUntil: p.delayed_until
      },
      message: `Payment **${p.id}** — Status: **${p.status}**, Amount: ${p.total_money?.amount ? (p.total_money.amount / 100).toFixed(2) : 'N/A'} ${p.total_money?.currency || ''}`
    };
  })
  .build();
