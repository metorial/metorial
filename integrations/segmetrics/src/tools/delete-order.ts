import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { spec } from '../spec';

export let deleteOrder = SlateTool.create(spec, {
  name: 'Delete Order',
  key: 'delete_order',
  description: `Permanently deletes an order (invoice) from a SegMetrics integration. This action **cannot be undone**.`,
  constraints: ['This is a permanent, irreversible action.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The unique identifier of the order/invoice to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      integrationId: ctx.config.integrationId!
    });

    let response = await client.deleteInvoice(ctx.input.orderId);

    return {
      output: {
        success: true,
        response
      },
      message: `Order **${ctx.input.orderId}** has been permanently deleted.`
    };
  })
  .build();
