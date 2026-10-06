import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { invoice } from '../lib/contracts';
import { invalid, pdfUrl } from '../lib/validation';
import { spec } from '../spec';

export const getInvoicePdf = SlateTool.create(spec, {
  tags: { readOnly: true },
  name: 'Get Invoice PDF',
  key: 'get_invoice_pdf',
  description:
    'Download the PDF for an existing invoice. Reads the current invoice PDF URL; does not create, approve or send an invoice.',
  instructions: ['Discover businessId with list_businesses and invoiceId with list_invoices.']
})
  .scopes(anyOf('invoice:read'))
  .input(
    z.object({
      businessId: z.string().describe('Permitted business ID from list_businesses.'),
      invoiceId: z.string().describe('Exact invoice ID from list_invoices.')
    })
  )
  .output(
    z.object({
      businessId: z.string(),
      invoiceId: z.string(),
      mimeType: z.literal('application/pdf'),
      viewUrl: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const resource = await new WaveClient(ctx.auth.token).getResource(
      'invoice',
      ctx.input.businessId,
      ctx.input.invoiceId
    );
    if (resource === null) invalid('The requested invoice was not found.');
    const result = invoice.safeParse(resource);
    if (!result.success)
      invalid('Wave returned an invalid invoice; the PDF could not be delivered.');
    await ctx.addAttachment({
      type: 'url',
      url: pdfUrl(result.data.pdfUrl),
      mimeType: 'application/pdf'
    });
    return {
      output: {
        ...ctx.input,
        mimeType: 'application/pdf' as const,
        viewUrl: result.data.viewUrl
      },
      message: 'The invoice PDF is ready to download.'
    };
  })
  .build();
