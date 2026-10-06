import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { documentOutput, mapDocument } from '../lib/schemas';
import { rejectFields, requireValue } from '../lib/validation';
import { spec } from '../spec';
export const manageDocument = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description:
    'Archive, restore, move, trash or permanently delete a document. Permanent deletion is irreversible; accepted deletion does not promise erasure of event history.',
  tags: { destructive: true }
})
  .input(
    z.object({
      documentId: z.string().describe('Exact document UUID or urlId'),
      action: z
        .enum(['archive', 'restore', 'delete', 'permanent_delete', 'move'])
        .describe('Lifecycle action'),
      collectionId: z
        .string()
        .optional()
        .describe(
          'Target collection for move, or destination when restoring a deleted collection'
        ),
      parentDocumentId: z.string().optional().describe('Target parent for move'),
      index: z.number().int().nonnegative().optional().describe('Position for move')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      title: z.string().optional(),
      action: z.string(),
      success: z.boolean(),
      document: documentOutput.optional(),
      affectedDocumentIds: z.array(z.string()).optional(),
      affectedCollectionIds: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action, documentId } = ctx.input;
    rejectFields(ctx.input, [
      'action',
      'documentId',
      ...(action === 'move'
        ? ['collectionId', 'parentDocumentId', 'index']
        : action === 'restore'
          ? ['collectionId']
          : [])
    ]);
    requireValue(
      action !== 'move' || ctx.input.collectionId || ctx.input.parentDocumentId,
      'Provide a destination collectionId or parentDocumentId for move.'
    );
    requireValue(
      ctx.input.parentDocumentId !== documentId,
      'A document cannot be moved beneath itself.'
    );
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    if (action === 'delete' || action === 'permanent_delete') {
      if (action === 'permanent_delete') {
        const current = await client.getDocument(documentId);
        requireValue(
          current.deletedAt,
          'Permanent deletion requires a document already in trash. Use action delete first, inspect the exact document, then request permanent_delete.'
        );
      }
      await client.deleteDocument(documentId, action === 'permanent_delete');
      return {
        output: { documentId, action, success: true },
        message:
          action === 'permanent_delete'
            ? 'Outline accepted permanent deletion. Event history and other copies may remain.'
            : 'Outline accepted moving the document to trash.'
      };
    }
    if (action === 'move') {
      const result = await client.moveDocument(
        documentId,
        ctx.input.collectionId,
        ctx.input.parentDocumentId,
        ctx.input.index
      );
      return {
        output: {
          documentId: result.document.id,
          title: result.document.title,
          action,
          success: true,
          document: mapDocument(result.document),
          affectedDocumentIds: result.affectedDocumentIds,
          affectedCollectionIds: result.affectedCollectionIds
        },
        message:
          'Outline confirmed the document move. Related document locations may also have changed.'
      };
    }
    const doc =
      action === 'archive'
        ? await client.archiveDocument(documentId)
        : await client.restoreDocument(documentId, ctx.input.collectionId);
    requireValue(
      action === 'archive' ? !!doc.archivedAt : !doc.archivedAt && !doc.deletedAt,
      'Outline returned an unexpected lifecycle state. Inspect the document before repeating this operation.'
    );
    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        action,
        success: true,
        document: mapDocument(doc)
      },
      message: `Outline confirmed document ${action}.`
    };
  })
  .build();
