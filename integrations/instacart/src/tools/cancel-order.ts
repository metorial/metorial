import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let cancelOrder = SlateTool.create(spec, {
  name: 'Cancel Order',
  key: 'cancel_order',
  description: `Cancel an existing order. Orders can only be cancelled before a shopper is assigned (i.e., before the order status moves to "acknowledged").

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  constraints: [
    'Orders cannot be cancelled once a shopper is assigned and the status moves to "acknowledged".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Connect user ID'),
      raw: z.unknown().optional().describe('Complete provider cancellation result'),
      orderId: z.string().describe('Order ID to cancel')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider cancellation result'),
      orderId: z.string().describe('Cancelled order ID'),
      status: z.string().describe('Order status after cancellation'),
      cancellationReason: z.string().optional().describe('Reason for cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      baseUrl: ctx.auth.baseUrl
    });

    let order = await client.cancelOrder(ctx.input.userId, ctx.input.orderId);

    return {
      output: {
        raw: order.raw,
        orderId: order.orderId,
        status: order.status,
        cancellationReason: order.cancellationReason
      },
      message: `Order **${order.orderId}** has been cancelled. Status: **${order.status}**.`
    };
  })
  .build();
