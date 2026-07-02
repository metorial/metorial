import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteInvoiceTool = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice from Zoho Books. Only draft invoices can be deleted.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let resp = await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: { success: true, message: resp.message },
      message: `Deleted invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
