import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice from FreeAgent. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The FreeAgent invoice ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the invoice was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: { deleted: true },
      message: `Deleted invoice **${ctx.input.invoiceId}**`
    };
  })
  .build();
