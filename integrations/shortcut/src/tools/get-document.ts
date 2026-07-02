import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieves a document by its ID, including its full content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.number().describe('ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.number().describe('ID of the document'),
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
    let doc = await client.getDocument(ctx.input.documentId);

    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        content: doc.content || '',
        appUrl: doc.app_url,
        archived: doc.archived ?? false,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      },
      message: `Retrieved document **${doc.title}** (ID: ${doc.id}) — [View in Shortcut](${doc.app_url})`
    };
  })
  .build();
