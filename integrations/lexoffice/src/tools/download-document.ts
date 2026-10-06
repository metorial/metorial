import { SlateTool } from 'slates';
import { z } from 'zod';
import { BASE_URL, Client, resourcePaths } from '../lib/client';
import { fail, pathId } from '../lib/validation';
import { spec } from '../spec';

export const downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Download a finalized invoice, credit note, quotation or order confirmation as PDF. Invoice and credit-note XRechnung documents can also be downloaded as XML. The PDF of an XRechnung is a preview; use its XML as the electronic invoice.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum(['invoice', 'credit_note', 'quotation', 'order_confirmation']),
      resourceId: z.string().describe('Exact finalized document ID'),
      format: z
        .enum(['pdf', 'xml'])
        .optional()
        .describe(
          'File format; defaults to PDF. XML requires an invoice or credit note with XRechnung profile.'
        )
    })
  )
  .output(
    z.object({
      resourceType: z.string(),
      resourceId: z.string(),
      format: z.string(),
      voucherStatus: z.string(),
      electronicDocumentProfile: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const format = ctx.input.format ?? 'pdf';
    if (format === 'xml' && !['invoice', 'credit_note'].includes(ctx.input.resourceType))
      fail('XML is supported only for invoices and credit notes with XRechnung profile.');
    const document = await new Client({ token: ctx.auth.token }).getResource(
      ctx.input.resourceType,
      ctx.input.resourceId
    );
    if (
      !('voucherStatus' in document) ||
      !document.voucherStatus ||
      document.voucherStatus === 'draft'
    )
      fail('A finalized document with a confirmed status is required for download.');
    const profile =
      'electronicDocumentProfile' in document ? document.electronicDocumentProfile : undefined;
    if (format === 'xml' && profile !== 'XRechnung')
      fail('XML download requires a confirmed XRechnung document profile.');
    await ctx.addAttachment({
      type: 'url',
      url: `${BASE_URL}/${resourcePaths[ctx.input.resourceType]}/${pathId(ctx.input.resourceId)}/file`,
      headers: {
        Authorization: `Bearer ${ctx.auth.token}`,
        Accept: format === 'pdf' ? 'application/pdf' : 'application/xml'
      },
      query: {}
    });
    return {
      output: {
        resourceType: ctx.input.resourceType,
        resourceId: document.id,
        format,
        voucherStatus: document.voucherStatus,
        electronicDocumentProfile: profile
      },
      message: `Document prepared for ${format.toUpperCase()} download.`
    };
  })
  .build();
