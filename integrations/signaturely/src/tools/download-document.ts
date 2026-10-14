import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Download a document as a PDF. Signaturely returns the signed PDF for a completed document and the source PDF for an incomplete document. Call list_documents to find a document ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().min(1).describe('Document ID returned by list_documents')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      mimeType: z.string().describe('Downloaded document media type')
    })
  )
  .handleInvocation(async ctx => {
    let url = await new Client({ token: ctx.auth.token }).getDocumentFile(
      ctx.input.documentId
    );
    await ctx.addAttachment({ type: 'url', url, mimeType: 'application/pdf' });
    return {
      output: { documentId: ctx.input.documentId, mimeType: 'application/pdf' },
      message: `Prepared document ${ctx.input.documentId} as a downloadable PDF.`
    };
  })
  .build();
