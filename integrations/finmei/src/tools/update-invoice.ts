import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient, readEntity, requireId } from '../lib/client';
import { spec } from '../spec';
import { buildInvoiceData, invoiceInput } from './create-invoice';

export let updateInvoice = SlateTool.create(spec, {
  key: 'update_invoice',
  name: 'Update Invoice',
  description:
    'Replace an invoice using the same complete details required for creation. Read get_invoice first to retain existing buyer, seller, line items, and payment fields.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    invoiceInput.extend({ invoiceId: z.string().describe('Invoice ID from list_invoices') })
  )
  .output(z.object({ invoiceId: z.string(), invoice: z.any() }))
  .handleInvocation(async ctx => {
    let result = await new FinmeiClient(ctx.auth.token).updateInvoice(
      ctx.input.invoiceId,
      buildInvoiceData(ctx.input)
    );
    let invoice = readEntity(result, 'invoice');
    let invoiceId = requireId(invoice.id, 'invoice ID');
    return { output: { invoiceId, invoice }, message: `Updated invoice \`${invoiceId}\`.` };
  })
  .build();
