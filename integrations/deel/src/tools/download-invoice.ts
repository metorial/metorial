import { anyOf, createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import type { Client } from '../lib/client';
import { dataObject, requireText } from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

let getDownload = async (client: Client, invoiceId: string) => {
  requireText(invoiceId, 'invoiceId');
  let file = dataObject(await client.getInvoiceDownload(invoiceId), 'invoice download');
  if (file.id !== undefined && file.id !== invoiceId)
    throw createApiServiceError('Deel returned download details for a different invoice.');
  let url = requireText(file.url, 'Invoice PDF download URL');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createApiServiceError('Deel returned an invalid invoice PDF URL.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash)
    throw createApiServiceError('Deel returned an unsupported invoice PDF URL.');
  let expiresAt = requireText(file.expires_at, 'Invoice PDF link expiry');
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())
    throw createApiServiceError(
      'Deel returned an invalid or expired invoice PDF link. Request the invoice again.'
    );
  return { url, expiresAt };
};

export let downloadInvoice = SlateTool.create(spec, {
  key: 'download_invoice',
  name: 'Download Invoice',
  description: 'Download an invoice as a PDF. Call list_invoices to discover invoice IDs.',
  tags: { readOnly: true }
})
  .scopes(anyOf('accounting:read'))
  .input(z.object({ invoiceId: z.string().describe('Invoice ID from list_invoices') }))
  .output(
    z.object({ invoiceId: z.string(), expiresAt: z.string(), downloadable: z.boolean() })
  )
  .handleInvocation(async ctx => {
    let file = await getDownload(createClient(ctx), ctx.input.invoiceId);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      mimeType: 'application/pdf',
      refreshReference: { invoiceId: ctx.input.invoiceId },
      refreshAt: file.expiresAt
    });
    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        expiresAt: file.expiresAt,
        downloadable: true
      },
      message: `Downloaded invoice **${ctx.input.invoiceId}** as a PDF.`
    };
  })
  .build();

let referenceSchema = z.object({ invoiceId: z.string().min(1) });
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'The invoice file reference is invalid. Request the invoice PDF again.'
    );
  return {
    ...(await getDownload(createClient(ctx), reference.data.invoiceId)),
    headers: {},
    query: {}
  };
});
