import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneEcommerceClient } from '../lib/ecommerce-client';
import { spec } from '../spec';

export let trackOrderFulfilled = SlateTool.create(spec, {
  name: 'Track Order Fulfilled',
  key: 'track_order_fulfilled',
  description: `Send an order fulfilled event to Sendlane, indicating that an order has been shipped. This can trigger post-purchase automations like shipping notifications and review requests.`,
  instructions: [
    'Use the integrationToken from your Sendlane Custom Integration settings.',
    'The eventId should match the order ID used in the original order placed event.'
  ]
})
  .input(
    z.object({
      integrationToken: z.string().describe('Sendlane Custom Integration token'),
      eventId: z.string().describe('Unique event identifier (should match the order)'),
      email: z.string().describe('Customer email address'),
      orderId: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Order ID from your platform'),
      total: z.number().optional().describe('Total monetary value of the order'),
      time: z.number().optional().describe('UNIX timestamp for historical sync')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let ecomClient = new SendlaneEcommerceClient(ctx.auth.token);

    await ecomClient.trackOrderFulfilled({
      token: ctx.input.integrationToken,
      eventId: ctx.input.eventId,
      email: ctx.input.email,
      orderId: ctx.input.orderId,
      total: ctx.input.total,
      time: ctx.input.time
    });

    return {
      output: { success: true },
      message: `Tracked order fulfillment for event **${ctx.input.eventId}** (${ctx.input.email}).`
    };
  })
  .build();
