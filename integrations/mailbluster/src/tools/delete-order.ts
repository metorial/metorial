import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteOrder = SlateTool.create(spec, {
  name: 'Delete Order',
  key: 'delete_order',
  description: `Permanently deletes an order by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteOrder(ctx.input.orderId);

    return {
      output: {
        message: result.message || `Order ${ctx.input.orderId} deleted`
      },
      message: `Order **${ctx.input.orderId}** deleted successfully.`
    };
  })
  .build();
