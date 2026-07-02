import { SlateTool } from 'slates';
import { z } from 'zod';
import { formatOrderPayload, RemarketyClient } from '../lib/client';
import { orderSchema } from '../lib/schemas';
import { spec } from '../spec';

export let upsertOrderTool = SlateTool.create(spec, {
  name: 'Create or Update Order',
  key: 'upsert_order',
  description: `Send an order creation or update event to Remarkety. Includes full order details such as line items, pricing, discounts, shipping, tax, fulfillment status, and customer information. This data powers automated campaigns like cart abandonment recovery and post-purchase follow-ups.`,
  instructions: [
    'Line item product IDs should match products in your Remarkety catalog. Unmatched products will be auto-created as disabled.',
    'Customer information should match existing customers; otherwise a new customer record will be created.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z
      .object({
        action: z
          .enum(['create', 'update'])
          .describe('Whether to create a new order or update an existing one')
      })
      .merge(orderSchema)
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was sent successfully'),
      eventType: z.string().describe('The event type that was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId,
      storeDomain: ctx.config.storeDomain,
      platform: ctx.config.platform
    });

    let isCreate = ctx.input.action === 'create';
    let { action, ...orderData } = ctx.input;
    let payload = formatOrderPayload(orderData as unknown as Record<string, unknown>);
    let eventType = isCreate ? 'orders/create' : 'orders/update';

    ctx.info(`Sending ${eventType} event for order ${ctx.input.orderId}`);

    await client.createOrUpdateOrder(payload, isCreate);

    return {
      output: {
        success: true,
        eventType
      },
      message: `Successfully sent **${eventType}** event for order **${ctx.input.orderId}** (${ctx.input.email}).`
    };
  })
  .build();
