import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let moneySchema = z.object({
  currency: z.string().describe('ISO 4217 currency code (e.g., "USD")'),
  value: z.string().describe('Monetary amount as a string (e.g., "29.99")')
});

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Import an order from a third-party sales channel into Squarespace. The imported order does not affect accounting data. Optionally sends a fulfillment notification to the customer.`,
  instructions: [
    'The idempotencyKey prevents duplicate order creation — use a unique value per order',
    'All monetary values must include currency code and value as a string'
  ],
  constraints: [
    'Rate limited to 100 requests per hour per website',
    'Channel name limited to 30 characters',
    'External order reference limited to 200 characters',
    'Grand total maximum is 20,000,000'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      idempotencyKey: z.string().describe('Unique key to prevent duplicate order creation'),
      channelName: z.string().describe('Name of the third-party sales channel (max 30 chars)'),
      externalOrderReference: z
        .string()
        .describe('Order ID from the external channel (max 200 chars)'),
      createdOn: z.string().describe('ISO 8601 UTC timestamp when the order was created'),
      grandTotal: moneySchema.describe('Total order amount'),
      priceTaxInterpretation: z
        .enum(['EXCLUSIVE', 'INCLUSIVE'])
        .describe('Whether prices include tax'),
      lineItems: z
        .array(
          z.object({
            variantId: z.string().optional().describe('Squarespace variant ID'),
            sku: z.string().optional().describe('Product SKU'),
            productName: z.string().optional().describe('Display name of the product'),
            quantity: z.number().describe('Number of items ordered'),
            unitPricePaid: moneySchema.describe('Price per unit')
          })
        )
        .describe('Items in the order'),
      customerEmail: z.string().optional().describe('Customer email address'),
      fulfillmentStatus: z
        .enum(['PENDING', 'FULFILLED', 'CANCELED'])
        .optional()
        .describe('Initial fulfillment status'),
      billingAddress: z
        .record(z.string(), z.any())
        .optional()
        .describe('Billing address object'),
      shippingAddress: z
        .record(z.string(), z.any())
        .optional()
        .describe('Shipping address object'),
      subtotal: moneySchema.optional().describe('Order subtotal before shipping/tax'),
      shippingTotal: moneySchema.optional().describe('Shipping cost'),
      discountTotal: moneySchema.optional().describe('Total discounts applied'),
      taxTotal: moneySchema.optional().describe('Total tax amount')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique identifier for the created order'),
      orderNumber: z.string().optional().describe('Human-readable order number'),
      fulfillmentStatus: z.string().optional().describe('Current fulfillment status'),
      createdOn: z.string().optional().describe('Creation timestamp'),
      raw: z.any().describe('Complete raw order data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let order = await client.createOrder(
      {
        channelName: ctx.input.channelName,
        externalOrderReference: ctx.input.externalOrderReference,
        createdOn: ctx.input.createdOn,
        grandTotal: ctx.input.grandTotal,
        priceTaxInterpretation: ctx.input.priceTaxInterpretation,
        lineItems: ctx.input.lineItems,
        customerEmail: ctx.input.customerEmail,
        fulfillmentStatus: ctx.input.fulfillmentStatus,
        billingAddress: ctx.input.billingAddress,
        shippingAddress: ctx.input.shippingAddress,
        subtotal: ctx.input.subtotal,
        shippingTotal: ctx.input.shippingTotal,
        discountTotal: ctx.input.discountTotal,
        taxTotal: ctx.input.taxTotal
      },
      ctx.input.idempotencyKey
    );

    return {
      output: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        fulfillmentStatus: order.fulfillmentStatus,
        createdOn: order.createdOn,
        raw: order
      },
      message: `Created order **#${order.orderNumber || order.id}** from channel "${ctx.input.channelName}"`
    };
  })
  .build();
