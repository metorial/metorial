import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SIGNWELL_API_BASE_URL, SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let getCompletedPdf = SlateTool.create(spec, {
  name: 'Get Completed PDF',
  key: 'get_completed_pdf',
  description: `Download the completed, fully-signed document PDF with its audit page. The document must be completed before the PDF is available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the completed document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      pdfUrl: z.string().describe('URL to download the completed signed PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.getCompletedPdf(ctx.input.documentId, true);
    let parsed = z
      .object({
        file_url: z.string().optional(),
        pdf_url: z.string().optional(),
        url: z.string().optional()
      })
      .safeParse(result);
    let pdfUrl = parsed.success
      ? (parsed.data.file_url ?? parsed.data.pdf_url ?? parsed.data.url)
      : typeof result === 'string'
        ? result
        : undefined;
    if (!pdfUrl || !z.url().safeParse(pdfUrl).success) {
      throw createApiServiceError(
        'SignWell did not return a valid completed PDF URL. Confirm that all recipients have completed signing.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: `${SIGNWELL_API_BASE_URL}/documents/${encodeURIComponent(ctx.input.documentId)}/completed_pdf`,
      headers: { 'X-Api-Key': ctx.auth.token },
      query: { url_only: 'false', audit_page: 'true', file_format: 'pdf' },
      filename: 'completed-document.pdf',
      mimeType: 'application/pdf'
    });

    return {
      output: {
        documentId: ctx.input.documentId,
        pdfUrl
      },
      message: `Completed PDF prepared for document **${ctx.input.documentId}**.`
    };
  })
  .build();
