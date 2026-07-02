import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteOrder = SlateTool.create(spec, {
  name: 'Delete Order',
  key: 'delete_order',
  description: `Delete an order from WooCommerce. By default moves to trash; use force to permanently delete.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The order ID to delete'),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe('True to permanently delete instead of moving to trash')
    })
  )
  .output(
    z.object({
      orderId: z.number(),
      orderNumber: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deleteOrder(ctx.input.orderId, ctx.input.force);
    let previous = result.previous ?? result;

    return {
      output: {
        orderId: previous.id ?? ctx.input.orderId,
        orderNumber: previous.number || String(ctx.input.orderId),
        deleted: true
      },
      message: `${ctx.input.force ? 'Permanently deleted' : 'Trashed'} order #${previous.number || ctx.input.orderId}.`
    };
  })
  .build();
