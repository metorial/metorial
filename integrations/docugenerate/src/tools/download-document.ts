import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient, fileMimeType } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Provides a downloadable copy of an existing generated document, including PDF, Word, or ZIP output. Use list_documents to discover document IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      documentId: z
        .string()
        .min(1)
        .describe(
          'Document ID. Use list_documents to discover generated documents for a template.'
        )
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID.'),
      templateId: z.string().describe('Source template ID.'),
      name: z.string().describe('Document name.'),
      filename: z.string().describe('Provider filename.'),
      format: z.string().describe('Document format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({ token: ctx.auth.token, region: ctx.config.region });
    let document = await client.getDocument(ctx.input.documentId);
    await ctx.addAttachment({
      type: 'url',
      url: document.document_uri,
      mimeType: fileMimeType(
        document.filename.toLowerCase().endsWith('.zip') ? '.zip' : document.format
      )
    });
    return {
      output: {
        documentId: document.id,
        templateId: document.template_id,
        name: document.name,
        filename: document.filename,
        format: document.format
      },
      message: `Prepared **${document.filename}** for download.`
    };
  })
  .build();
