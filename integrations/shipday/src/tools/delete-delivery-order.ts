import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDeliveryOrder = SlateTool.create(spec, {
  name: 'Delete Delivery Order',
  key: 'delete_delivery_order',
  description: `Permanently removes a delivery order from Shipday. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Unique Shipday order ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    await client.deleteOrder(ctx.input.orderId);

    return {
      output: {
        success: true
      },
      message: `Deleted delivery order **${ctx.input.orderId}**.`
    };
  })
  .build();
