import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoicePdf = SlateTool.create(spec, {
  name: 'Get Invoice PDF',
  key: 'get_invoice_pdf',
  description: `Prepare a downloadable PDF for an invoice without marking the invoice as sent.`,
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
      base64Content: z
        .string()
        .optional()
        .describe(
          'Base64-encoded PDF content returned by sevDesk, alongside the downloadable PDF.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let result = await client.getInvoicePdf(ctx.input.invoiceId);
    let pdfData = z
      .object({
        filename: z.string().optional(),
        mimeType: z.string().optional(),
        base64encoded: z.literal(true),
        content: z.string().min(1)
      })
      .safeParse(result?.objects ?? result);
    if (!pdfData.success) {
      throw createApiServiceError(
        'sevDesk did not return the documented base64-encoded invoice PDF response.'
      );
    }
    let filename = pdfData.data.filename;
    await ctx.addAttachment({
      type: 'url',
      url: `https://my.sevdesk.de/api/v1/Invoice/${encodeURIComponent(ctx.input.invoiceId)}/getPdf`,
      headers: { Authorization: ctx.auth.token },
      query: { download: 'true', preventSendBy: 'true' },
      filename,
      mimeType: pdfData.data.mimeType ?? 'application/pdf'
    });

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        filename,
        base64Content: pdfData.data.content
      },
      message: `Retrieved PDF for invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
