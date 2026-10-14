import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { documentIdInputs, resolveDocumentId } from '../lib/documents';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Updates a document's title or content by UUID. Call list_documents to discover accessible document UUIDs. Specify contentFormat when sending Markdown.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ...documentIdInputs,
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content'),
      contentFormat: z
        .enum(['markdown', 'html'])
        .optional()
        .describe(
          'Format of new content (default: html). Use markdown when writing back content from get_document.'
        )
    })
  )
  .output(
    z.object({
      documentId: z.number().optional().describe('Legacy numeric document ID, when available'),
      documentUuid: z.string().describe('UUID of the document'),
      title: z.string().describe('Updated title'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let documentId = resolveDocumentId(ctx.input);
    if (ctx.input.title === undefined && ctx.input.content === undefined) {
      throw createApiServiceError('Provide title or content to update a document.');
    }
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.title !== undefined) params.title = ctx.input.title;
    if (ctx.input.content !== undefined) params.content = ctx.input.content;
    if (ctx.input.contentFormat !== undefined) params.content_format = ctx.input.contentFormat;

    let doc = await client.updateDocument(documentId, params);

    return {
      output: {
        documentId: typeof doc.id === 'number' ? doc.id : undefined,
        documentUuid: String(doc.id),
        title: doc.title,
        appUrl: doc.app_url,
        updatedAt: doc.updated_at
      },
      message: `Updated document **${doc.title}** (ID: ${doc.id}) — [View in Shortcut](${doc.app_url})`
    };
  })
  .build();
