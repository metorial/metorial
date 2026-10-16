import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

export let updateOrderExpiration = SlateTool.create(spec, {
  name: 'Update Order Expiration',
  key: 'update_order_expiration',
  description: `Update the expiration date for an existing gift order. Use this to extend or shorten the time a recipient has to accept their gift.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to update'),
      expiresAt: z.string().describe('New expiration timestamp in ISO 8601 format')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Updated order ID'),
      status: z.string().describe('Current order status'),
      expiresAt: z.string().nullable().describe('Updated expiration timestamp'),
      referenceId: z.string().describe('Display reference ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGoodyClient(ctx);

    let o = await client.updateOrderExpiration(ctx.input.orderId, ctx.input.expiresAt);

    return {
      output: {
        orderId: o.id,
        status: o.status,
        expiresAt: o.expires_at ?? null,
        referenceId: o.reference_id
      },
      message: `Order **${o.reference_id}** expiration updated to **${o.expires_at}**.`
    };
  })
  .build();
