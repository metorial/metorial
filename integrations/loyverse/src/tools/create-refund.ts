import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Create a refund for an existing sales receipt. Refunded items are automatically restocked. Only receipts paid with a single payment type can be refunded via the API.`,
  constraints: [
    'Only receipts paid with a single payment type can be refunded.',
    'Receipts paid via integrated payments (SumUp, iZettle, etc.) must be refunded through the POS app.',
    'A successful refund will automatically restock the refunded items.'
  ]
})
  .input(
    z.object({
      receiptNumber: z.string().describe('Receipt number of the original sale to refund'),
      lineItems: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID to refund'),
            quantity: z.number().describe('Quantity to refund'),
            price: z.number().optional().describe('Override refund price per unit')
          })
        )
        .min(1)
        .describe('Items to refund')
    })
  )
  .output(
    z.object({
      receiptNumber: z.string().describe('Refund receipt number'),
      receiptType: z.string().optional(),
      totalMoney: z.number().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {
      line_items: ctx.input.lineItems.map(li => ({
        variant_id: li.variantId,
        quantity: li.quantity,
        price: li.price
      }))
    };

    let result = await client.createRefund(ctx.input.receiptNumber, body);

    return {
      output: {
        receiptNumber: result.receipt_number,
        receiptType: result.receipt_type,
        totalMoney: result.total_money,
        createdAt: result.created_at
      },
      message: `Created refund receipt **${result.receipt_number}** for original receipt **${ctx.input.receiptNumber}**.`
    };
  })
  .build();
