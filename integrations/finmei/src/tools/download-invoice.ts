import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient, readEntity, requireId } from '../lib/client';
import { spec } from '../spec';

export let downloadInvoice = SlateTool.create(spec, {
  key: 'download_invoice',
  name: 'Download Invoice',
  description:
    'Prepare a downloadable PDF for an invoice. Use list_invoices to find the invoice ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ invoiceId: z.string().describe('Invoice ID from list_invoices') }))
  .output(z.object({ invoiceId: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);
    let invoice = readEntity(await client.getInvoice(ctx.input.invoiceId), 'invoice');
    let invoiceId = requireId(invoice.id, 'invoice ID');
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl('invoices', ctx.input.invoiceId),
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: 'application/pdf'
    });
    return {
      output: { invoiceId, mimeType: 'application/pdf' },
      message: `Prepared invoice \`${invoiceId}\` as a PDF.`
    };
  })
  .build();
