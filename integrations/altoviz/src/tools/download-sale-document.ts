import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadSaleDocument = SlateTool.create(spec, {
  name: 'Download Sales Document',
  key: 'download_sale_document',
  description:
    'Prepare a sales invoice, quote, or credit as a downloadable PDF. Use the corresponding list tool to discover document IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentType: z.enum(['invoice', 'quote', 'credit']),
      documentId: z
        .number()
        .describe(
          'Document ID from list_sale_invoices, list_sale_quotes, or list_sale_credits'
        )
    })
  )
  .output(
    z.object({
      documentType: z.enum(['invoice', 'quote', 'credit']),
      documentId: z.number(),
      number: z.string().nullable().optional(),
      mimeType: z.literal('application/pdf')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let resources = { invoice: 'SalesInvoices', quote: 'SalesQuotes', credit: 'SalesCredits' };
    let document =
      ctx.input.documentType === 'invoice'
        ? await client.getSaleInvoice(ctx.input.documentId)
        : ctx.input.documentType === 'quote'
          ? await client.getSaleQuote(ctx.input.documentId)
          : await client.getSaleCredit(ctx.input.documentId);
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.altoviz.com/v1/${resources[ctx.input.documentType]}/Download/${document.id}`,
      headers: { 'X-API-KEY': ctx.auth.token },
      mimeType: 'application/pdf'
    });
    return {
      output: {
        documentType: ctx.input.documentType,
        documentId: document.id,
        number: document.number,
        mimeType: 'application/pdf' as const
      },
      message: `Prepared ${ctx.input.documentType} **${document.number || document.id}** for download.`
    };
  })
  .build();
