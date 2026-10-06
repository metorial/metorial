import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { documentIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export const downloadDocument = SlateTool.create(spec, {
  key: 'download_document',
  name: 'Download Document',
  description:
    'Download a knowledge base document as an HTML file. Call list_documents to discover the document ID.',
  tags: { readOnly: true }
})
  .input(z.object({ documentId: documentIdSchema }))
  .output(z.object({ documentId: z.string(), name: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    const document = await new Client({ token: ctx.auth.token }).getDocument(
      ctx.input.documentId
    );
    if (
      !z.url().safeParse(document.contentUrl).success ||
      !['http:', 'https:'].includes(new URL(document.contentUrl).protocol)
    ) {
      throw createApiServiceError(
        'This document does not have a download URL yet. Wait for processing to finish and retry.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: document.contentUrl,
      mimeType: 'text/html',
      filename: `${document.name}.html`
    });
    return {
      output: { documentId: document.documentId, name: document.name, mimeType: 'text/html' },
      message: `Prepared **${document.name}** as a downloadable HTML file.`
    };
  });
