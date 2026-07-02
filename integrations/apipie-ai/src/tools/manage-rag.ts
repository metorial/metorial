import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let manageRag = SlateTool.create(spec, {
  name: 'Manage RAG Documents',
  key: 'manage_rag',
  description: `Upload documents to RAG collections, list existing collections, and delete collections. Documents are automatically vectorized and can be referenced in chat completions using the "ragTune" parameter to augment model responses with your own data.`,
  instructions: [
    'Use action "upload" to add a document to a collection. Supports PDF, DOC, DOCX, TXT, CSV, XLS, XLSX.',
    'Use action "list" to see all your RAG collections.',
    'Use action "delete" to remove a collection or specific document IDs.',
    'After uploading, reference the collection in chat completions by setting "ragTune" to the collection name.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['upload', 'list', 'delete'])
        .describe('Operation to perform on RAG collections'),
      collection: z
        .string()
        .optional()
        .describe('Collection name (required for "upload" and "delete" actions)'),
      documentUrl: z
        .string()
        .optional()
        .describe(
          'URL of the document to upload (required for "upload" action). Supports PDF, DOC, DOCX, TXT, CSV, XLS, XLSX.'
        ),
      metatag: z.string().optional().describe('Categorization tag for the uploaded document'),
      deleteAll: z
        .boolean()
        .optional()
        .describe('Set to true to delete the entire collection (for "delete" action)'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Specific document IDs to delete from the collection')
    })
  )
  .output(
    z.object({
      collections: z.array(z.string()).optional().describe('List of RAG collection names'),
      uploaded: z.boolean().optional().describe('Whether the document upload was successful'),
      deleted: z.boolean().optional().describe('Whether the deletion was successful'),
      rawResponse: z.unknown().optional().describe('Raw API response for reference')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'upload') {
      if (!ctx.input.collection)
        throw new Error('"collection" is required for the upload action.');
      if (!ctx.input.documentUrl)
        throw new Error('"documentUrl" is required for the upload action.');

      let result = await client.uploadRagDocument({
        collection: ctx.input.collection,
        url: ctx.input.documentUrl,
        metatag: ctx.input.metatag
      });

      return {
        output: {
          uploaded: true,
          rawResponse: result
        },
        message: `Uploaded document to RAG collection **${ctx.input.collection}**. You can now reference this collection in chat completions using the \`ragTune\` parameter.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listRagCollections();
      let collections = Array.isArray(result) ? result : (result?.collections ?? []);

      return {
        output: {
          collections
        },
        message: `Found **${collections.length}** RAG collection${collections.length !== 1 ? 's' : ''}.${collections.length > 0 ? `\n\n${collections.map((c: string) => `- \`${c}\``).join('\n')}` : ''}`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.collection)
        throw new Error('"collection" is required for the delete action.');

      let result = await client.deleteRagCollection({
        collection: ctx.input.collection,
        deleteAll: ctx.input.deleteAll,
        ids: ctx.input.documentIds
      });

      return {
        output: {
          deleted: true,
          rawResponse: result
        },
        message: ctx.input.deleteAll
          ? `Deleted RAG collection **${ctx.input.collection}** and all its documents.`
          : `Deleted ${ctx.input.documentIds?.length ?? 0} document(s) from collection **${ctx.input.collection}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
