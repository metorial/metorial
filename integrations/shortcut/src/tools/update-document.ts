import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Updates an existing document's title or content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.number().describe('ID of the document to update'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content')
    })
  )
  .output(
    z.object({
      documentId: z.number().describe('ID of the updated document'),
      title: z.string().describe('Updated title'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.title !== undefined) params.title = ctx.input.title;
    if (ctx.input.content !== undefined) params.content = ctx.input.content;

    let doc = await client.updateDocument(ctx.input.documentId, params);

    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        appUrl: doc.app_url,
        updatedAt: doc.updated_at
      },
      message: `Updated document **${doc.title}** (ID: ${doc.id}) — [View in Shortcut](${doc.app_url})`
    };
  })
  .build();
