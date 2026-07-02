import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, deleteDocuments, listDocuments } from '../lib/client';
import { spec } from '../spec';

export let manageDocumentsTool = SlateTool.create(spec, {
  name: 'Manage Knowledge Base Documents',
  key: 'manage_documents',
  description: `List or delete documents within a knowledge base. Use to browse indexed documents, filter by title, or remove specific documents from the knowledge base.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the knowledge base'),
      action: z.enum(['list', 'delete']).describe('Action to perform on documents'),
      title: z.string().optional().describe('Filter documents by title (for list action)'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Document IDs to delete (required for delete action)')
    })
  )
  .output(
    z.object({
      documentIds: z
        .array(z.string())
        .optional()
        .describe('List of document IDs (for list action)'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await listDocuments(api, ctx.input.knowledgeBaseId, {
        title: ctx.input.title
      });

      let docIds = result.document_ids ?? [];
      return {
        output: {
          documentIds: docIds,
          success: true
        },
        message: `Found **${docIds.length}** documents in knowledge base \`${ctx.input.knowledgeBaseId}\`.`
      };
    } else {
      if (!ctx.input.documentIds || ctx.input.documentIds.length === 0) {
        throw new Error('documentIds is required for the delete action');
      }
      await deleteDocuments(api, ctx.input.knowledgeBaseId, ctx.input.documentIds);
      return {
        output: {
          success: true
        },
        message: `Deleted **${ctx.input.documentIds.length}** document(s) from knowledge base \`${ctx.input.knowledgeBaseId}\`.`
      };
    }
  })
  .build();
