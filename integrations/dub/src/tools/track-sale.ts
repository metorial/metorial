import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackSale = SlateTool.create(spec, {
  name: 'Track Sale',
  key: 'track_sale',
  description: `Track a sale conversion event. Records a purchase attributed to a customer, with amount, currency, and optional payment processor details. Supports Stripe, Shopify, Polar, Paddle, RevenueCat, or custom processors.`,
  instructions: [
    'Amount should be in cents (e.g., 1000 for $10.00) for most currencies',
    'Use invoiceId as an idempotency key to prevent duplicate tracking'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      customerExternalId: z.string().describe("Your system's unique customer ID"),
      amount: z.number().describe('Sale amount in cents (e.g., 4900 = $49.00)'),
      currency: z.string().optional().describe('ISO 4217 currency code (default: usd)'),
      eventName: z.string().optional().describe('Event name (default: "Purchase")'),
      paymentProcessor: z
        .enum(['stripe', 'shopify', 'polar', 'paddle', 'revenuecat', 'custom'])
        .optional()
        .describe('Payment processor used'),
      invoiceId: z.string().optional().describe('Invoice ID for idempotency'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional sale metadata'),
      clickId: z
        .string()
        .optional()
        .describe('Click ID for direct attribution via dub_id cookie'),
      customerName: z.string().optional().describe('Customer name'),
      customerEmail: z.string().optional().describe('Customer email')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('The tracked event name'),
      customerId: z.string().describe('Dub customer ID'),
      customerExternalId: z.string().nullable().describe('Your customer ID'),
      saleAmount: z.number().describe('Sale amount in cents'),
      saleCurrency: z.string().describe('Currency code'),
      paymentProcessor: z.string().describe('Payment processor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.trackSale({
      customerExternalId: ctx.input.customerExternalId,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      eventName: ctx.input.eventName,
      paymentProcessor: ctx.input.paymentProcessor,
      invoiceId: ctx.input.invoiceId,
      metadata: ctx.input.metadata,
      clickId: ctx.input.clickId,
      customerName: ctx.input.customerName,
      customerEmail: ctx.input.customerEmail
    });

    return {
      output: {
        eventName: result.eventName,
        customerId: result.customer.id,
        customerExternalId: result.customer.externalId,
        saleAmount: result.sale.amount,
        saleCurrency: result.sale.currency,
        paymentProcessor: result.sale.paymentProcessor
      },
      message: `Tracked sale of **${result.sale.amount} ${result.sale.currency.toUpperCase()}** for customer \`${ctx.input.customerExternalId}\``
    };
  })
  .build();
