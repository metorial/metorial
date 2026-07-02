import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDocument = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description: `Perform lifecycle actions on a document: archive, restore, delete, or move it to a different collection or parent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document'),
      action: z
        .enum(['archive', 'restore', 'delete', 'permanent_delete', 'move'])
        .describe('Action to perform'),
      collectionId: z.string().optional().describe('Target collection ID (for move action)'),
      parentDocumentId: z
        .string()
        .optional()
        .describe('Target parent document ID (for move action)')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      title: z.string().optional(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { documentId, action } = ctx.input;
    let title: string | undefined;

    switch (action) {
      case 'archive': {
        let doc = await client.archiveDocument(documentId);
        title = doc.title;
        break;
      }
      case 'restore': {
        let doc = await client.restoreDocument(documentId);
        title = doc.title;
        break;
      }
      case 'delete': {
        await client.deleteDocument(documentId, false);
        break;
      }
      case 'permanent_delete': {
        await client.deleteDocument(documentId, true);
        break;
      }
      case 'move': {
        let doc = await client.moveDocument(
          documentId,
          ctx.input.collectionId,
          ctx.input.parentDocumentId
        );
        title = doc.title;
        break;
      }
    }

    return {
      output: {
        documentId,
        title,
        action,
        success: true
      },
      message: `Successfully performed **${action}** on document${title ? ` **"${title}"**` : ''}.`
    };
  })
  .build();
