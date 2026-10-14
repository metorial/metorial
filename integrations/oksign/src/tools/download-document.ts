import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Prepare a source or signed document as a downloadable PDF. Use get_linked_documents to find the signed document ID when you have its source ID.',
  constraints: ['Document downloads are limited to 3 requests per second.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({ documentId: z.string().describe('Source or signed document ID to download') })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      filename: z.string().describe('Document filename'),
      mimeType: z.string().describe('Download MIME type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let document = await client.documentExists(ctx.input.documentId);
    await ctx.addAttachment({
      type: 'url',
      url: 'https://oksign.be/services/rest/v1/document/retrieve',
      mimeType: 'application/pdf',
      headers: {
        'x-oksign-authorization': ctx.auth.token,
        'x-oksign-docid': ctx.input.documentId,
        accept: 'application/pdf'
      }
    });
    return {
      output: {
        documentId: ctx.input.documentId,
        filename: document.filename,
        mimeType: 'application/pdf'
      },
      message: `Prepared **${document.filename}** for download.`
    };
  })
  .build();
