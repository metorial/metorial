import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient, normalizeServerUrl } from '../lib/client';
import { spec } from '../spec';

export let downloadAttachment = SlateTool.create(spec, {
  name: 'Download Attachment',
  key: 'download_attachment',
  description:
    'Download a document attachment. Call list_attachments to discover attachment IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      attachmentId: z.number().describe('Attachment ID from list_attachments')
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.any())
        .describe('Provider metadata for the downloaded attachment')
    })
  )
  .handleInvocation(async ctx => {
    let metadata = await new GristClient(ctx.auth).getAttachmentMetadata(
      ctx.input.documentId,
      ctx.input.attachmentId
    );
    await ctx.addAttachment({
      type: 'url',
      url: `${normalizeServerUrl(ctx.auth.serverUrl)}/api/docs/${encodeURIComponent(ctx.input.documentId)}/attachments/${encodeURIComponent(String(ctx.input.attachmentId))}/download`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      filename: typeof metadata.fileName === 'string' ? metadata.fileName : undefined
    });
    return { output: { metadata }, message: 'Prepared the attachment for download.' };
  })
  .build();

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Download a Grist document as a SQLite file, optionally removing its history or exporting its structure as a template.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      nohistory: z
        .boolean()
        .optional()
        .describe('Remove document history from the downloaded file'),
      template: z
        .boolean()
        .optional()
        .describe('Remove all data and history, keeping the document structure')
    })
  )
  .output(
    z.object({
      document: z
        .record(z.string(), z.any())
        .describe('Provider metadata for the downloaded document')
    })
  )
  .handleInvocation(async ctx => {
    let document = await new GristClient(ctx.auth).getDocument(ctx.input.documentId);
    let query: Record<string, string> = {};
    if (ctx.input.nohistory !== undefined) query.nohistory = String(ctx.input.nohistory);
    if (ctx.input.template !== undefined) query.template = String(ctx.input.template);
    await ctx.addAttachment({
      type: 'url',
      url: `${normalizeServerUrl(ctx.auth.serverUrl)}/api/docs/${encodeURIComponent(ctx.input.documentId)}/download`,
      mimeType: 'application/x-sqlite3',
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      query
    });
    return { output: { document }, message: 'Prepared the document for download.' };
  })
  .build();
