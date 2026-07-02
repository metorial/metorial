import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Download a successfully generated PDFMonkey PDF or image and return the file bytes as a Slate attachment. Structured output only contains file metadata.`,
  instructions: [
    'The document must have status "success". Use Get Document first for async generations.',
    'PDFMonkey download URLs expire after 1 hour; this tool fetches a fresh document card before downloading.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the successful document to download')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the downloaded document'),
      status: z.string().describe('Document status returned by PDFMonkey'),
      filename: z.string().nullable().describe('Generated filename when available'),
      mimeType: z.string().describe('MIME type of the returned attachment'),
      byteLength: z.number().describe('Decoded byte length of the returned attachment'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.downloadDocumentFile(ctx.input.documentId);

    return {
      output: {
        documentId: String(result.document.id),
        status: String(result.document.status),
        filename: result.filename,
        mimeType: result.mimeType,
        byteLength: result.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(result.contentBase64, result.mimeType)],
      message: `Downloaded document **${ctx.input.documentId}** as an attachment (${result.byteLength} bytes).`
    };
  })
  .build();
