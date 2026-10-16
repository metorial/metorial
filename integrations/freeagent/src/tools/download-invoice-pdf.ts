import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let downloadInvoicePdf = SlateTool.create(spec, {
  name: 'Download Invoice PDF',
  key: 'download_invoice_pdf',
  description: 'Download the PDF for a FreeAgent invoice.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('Invoice ID from list_invoices or get_invoice')
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      filename: z.string(),
      mimeType: z.literal('application/pdf')
    })
  )
  .handleInvocation(async ctx => {
    let bytes = await createClient(ctx).getInvoicePdf(ctx.input.invoiceId);
    let filename = `invoice-${ctx.input.invoiceId.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes), {
        headers: { 'Content-Type': 'application/pdf' }
      }),
      filename,
      mimeType: 'application/pdf'
    });
    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        filename,
        mimeType: 'application/pdf' as const
      },
      message: 'Prepared the invoice PDF for download.'
    };
  })
  .build();
