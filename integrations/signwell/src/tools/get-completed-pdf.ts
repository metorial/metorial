import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let getCompletedPdf = SlateTool.create(spec, {
  name: 'Get Completed PDF',
  key: 'get_completed_pdf',
  description: `Download or retrieve the URL for a completed, fully-signed document PDF. The document must have been completed (all recipients signed) before the PDF is available.`,
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

    return {
      output: {
        documentId: ctx.input.documentId,
        pdfUrl: result.pdf_url || result.url || result
      },
      message: `Completed PDF URL retrieved for document **${ctx.input.documentId}**.`
    };
  })
  .build();
