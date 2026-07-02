import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoicePdf = SlateTool.create(spec, {
  name: 'Get Invoice PDF',
  key: 'get_invoice_pdf',
  description: `Retrieve the PDF download URL for an invoice. The returned URL can be used to download the rendered invoice PDF.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to get the PDF for')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      filename: z.string().optional().describe('PDF filename'),
      base64Content: z.string().optional().describe('Base64-encoded PDF content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let result = await client.getInvoicePdf(ctx.input.invoiceId);

    let pdfData = result?.objects ?? result;

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        filename: pdfData?.filename ?? undefined,
        base64Content: pdfData?.content ?? pdfData?.base64 ?? undefined
      },
      message: `Retrieved PDF for invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
