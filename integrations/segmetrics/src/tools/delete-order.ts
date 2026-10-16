import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { importScopeFields, resolveImportConfig } from '../lib/context';
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
      ...importScopeFields,
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
    let client = new ImportClient(resolveImportConfig(ctx));

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
