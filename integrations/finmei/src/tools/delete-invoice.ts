import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice from Finmei by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: {
        success: true
      },
      message: `Deleted invoice \`${ctx.input.invoiceId}\`.`
    };
  })
  .build();
