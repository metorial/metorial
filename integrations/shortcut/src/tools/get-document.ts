import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { documentIdInputs, resolveDocumentId } from '../lib/documents';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieves a document's content by UUID. Call list_documents to discover accessible document UUIDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...documentIdInputs,
      contentFormat: z
        .enum(['markdown', 'html'])
        .optional()
        .describe('Format to retrieve (default: markdown)')
    })
  )
  .output(
    z.object({
      documentId: z.number().optional().describe('Legacy numeric document ID, when available'),
      documentUuid: z.string().describe('UUID of the document'),
      title: z.string().describe('Title of the document'),
      content: z.string().describe('Document content'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      archived: z.boolean().describe('Whether the document is archived'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let doc = await client.getDocument(resolveDocumentId(ctx.input), ctx.input.contentFormat);

    return {
      output: {
        documentId: typeof doc.id === 'number' ? doc.id : undefined,
        documentUuid: String(doc.id),
        title: doc.title,
        content:
          (ctx.input.contentFormat === 'html' ? doc.content_html : doc.content_markdown) ?? '',
        appUrl: doc.app_url,
        archived: doc.archived ?? false,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      },
      message: `Retrieved document **${doc.title}** (ID: ${doc.id}) — [View in Shortcut](${doc.app_url})`
    };
  })
  .build();
