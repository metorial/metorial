import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDeliveryOrder = SlateTool.create(spec, {
  name: 'Delete Delivery Order',
  key: 'delete_delivery_order',
  description: `Delete an exact delivery order and confirm it is no longer returned by its order-number lookup. This does not guarantee erasure of delivery history or charges.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Unique Shipday order ID to delete'),
      currentOrderNumber: z
        .string()
        .optional()
        .describe('Current reference required when the order is absent from active orders')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    await client.deleteOrder(ctx.input.orderId, ctx.input.currentOrderNumber);

    return {
      output: {
        success: true
      },
      message: `Deleted delivery order **${ctx.input.orderId}**.`
    };
  })
  .build();
