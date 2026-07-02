import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order at a Square location. Supports line items, taxes, discounts, fulfillments, and customer association. Orders start in OPEN state.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      locationId: z.string().describe('Location ID where the order is placed'),
      lineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Line items for the order. Each item should have name, quantity, and base_price_money or catalog_object_id'
        ),
      taxes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Taxes to apply to the order'),
      discounts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Discounts to apply to the order'),
      fulfillments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Fulfillment details (pickup, shipment, or delivery)'),
      customerId: z.string().optional().describe('Customer ID to associate with the order'),
      referenceId: z.string().optional().describe('Your custom reference ID'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate orders. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      orderId: z.string().optional(),
      locationId: z.string().optional(),
      state: z.string().optional(),
      totalMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      createdAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let o = await client.createOrder({
      locationId: ctx.input.locationId,
      lineItems: ctx.input.lineItems,
      taxes: ctx.input.taxes,
      discounts: ctx.input.discounts,
      fulfillments: ctx.input.fulfillments,
      customerId: ctx.input.customerId,
      referenceId: ctx.input.referenceId,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });

    return {
      output: {
        orderId: o.id,
        locationId: o.location_id,
        state: o.state,
        totalMoney: o.total_money,
        createdAt: o.created_at,
        version: o.version
      },
      message: `Order **${o.id}** created at location ${o.location_id}. State: **${o.state}**`
    };
  })
  .build();
