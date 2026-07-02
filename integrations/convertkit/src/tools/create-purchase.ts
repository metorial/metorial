import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let createPurchase = SlateTool.create(spec, {
  name: 'Create Purchase',
  key: 'create_purchase',
  description: `Import a purchase/transaction record into Kit. Associates a purchase with a subscriber by email. Includes product details, pricing, and transaction metadata.`,
  constraints: [
    'This endpoint requires OAuth authentication — API key auth is not supported for purchases.'
  ]
})
  .input(
    z.object({
      subscriberEmail: z
        .string()
        .describe('Email address of the subscriber who made the purchase'),
      transactionId: z.string().describe('Unique transaction/order ID from your system'),
      status: z
        .enum(['paid', 'refunded', 'cancelled'])
        .optional()
        .describe('Transaction status (defaults to "paid")'),
      subtotal: z.number().optional().describe('Subtotal amount before tax/shipping'),
      tax: z.number().optional().describe('Tax amount'),
      shipping: z.number().optional().describe('Shipping cost'),
      discount: z.number().optional().describe('Discount amount'),
      total: z.number().optional().describe('Total transaction amount'),
      currency: z.string().optional().describe('ISO 4217 currency code (defaults to "USD")'),
      transactionTime: z.string().optional().describe('ISO 8601 transaction timestamp'),
      products: z
        .array(
          z.object({
            productName: z.string().describe('Product name'),
            productId: z.string().optional().describe('Product ID in your system'),
            lineItemId: z.string().optional().describe('Line item ID'),
            quantity: z.number().describe('Quantity purchased'),
            unitPrice: z.number().describe('Price per unit'),
            sku: z.string().optional().describe('Product SKU')
          })
        )
        .describe('Products included in the purchase')
    })
  )
  .output(
    z.object({
      purchaseId: z.number().describe('Kit purchase record ID'),
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().describe('Transaction status'),
      total: z.number().describe('Total amount'),
      currency: z.string().describe('Currency code'),
      transactionTime: z.string().describe('Transaction timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let input = ctx.input;

    let purchase = await client.createPurchase({
      emailAddress: input.subscriberEmail,
      transactionId: input.transactionId,
      status: input.status,
      subtotal: input.subtotal,
      tax: input.tax,
      shipping: input.shipping,
      discount: input.discount,
      total: input.total,
      currency: input.currency,
      transactionTime: input.transactionTime,
      products: input.products.map(p => ({
        name: p.productName,
        pid: p.productId,
        lid: p.lineItemId,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        sku: p.sku
      }))
    });

    return {
      output: {
        purchaseId: purchase.id,
        transactionId: purchase.transaction_id,
        status: purchase.status,
        total: purchase.total,
        currency: purchase.currency,
        transactionTime: purchase.transaction_time
      },
      message: `Created purchase **${purchase.transaction_id}** — ${purchase.currency} ${purchase.total}`
    };
  });
