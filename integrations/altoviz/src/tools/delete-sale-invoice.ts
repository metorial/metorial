import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSaleInvoice = SlateTool.create(spec, {
  name: 'Delete Sale Invoice',
  key: 'delete_sale_invoice',
  description: `Delete a sales invoice from Altoviz. Only draft invoices can be deleted.`,
  constraints: ['Only draft invoices can be deleted.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Altoviz invoice ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSaleInvoice(ctx.input.invoiceId);
    return {
      output: { deleted: true },
      message: `Deleted invoice with ID **${ctx.input.invoiceId}**.`
    };
  })
  .build();
