import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import { mapOrderSummary, orderSummaryOutputSchema } from './order-shared';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create an OPEN or DRAFT order at a Square location. Use DRAFT for subscription order templates. Supports line items, taxes, discounts, service charges, fulfillments, and customer association. Discover locations with list_locations.`,
  tags: { destructive: false }
})
  .scopes(allOf('ORDERS_WRITE'))
  .input(
    z.object({
      locationId: z
        .string()
        .describe('Location ID where the order is placed; discover with list_locations'),
      state: z
        .enum(['OPEN', 'DRAFT'])
        .optional()
        .describe(
          'Order state. Use DRAFT for a subscription phase order template; Square defaults to OPEN.'
        ),
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
      serviceCharges: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Order service charges, such as fixed fees or percentage charges'),
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
  .output(orderSummaryOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let o = await client.createOrder({
      locationId: ctx.input.locationId,
      state: ctx.input.state,
      lineItems: ctx.input.lineItems,
      taxes: ctx.input.taxes,
      discounts: ctx.input.discounts,
      serviceCharges: ctx.input.serviceCharges,
      fulfillments: ctx.input.fulfillments,
      customerId: ctx.input.customerId,
      referenceId: ctx.input.referenceId,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });

    return {
      output: mapOrderSummary(o),
      message: `Order **${o.id}** created at location ${o.location_id}. State: **${o.state}**`
    };
  })
  .build();
