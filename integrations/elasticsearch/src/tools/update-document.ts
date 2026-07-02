import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateDocumentTool = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Partially update an existing document in an Elasticsearch index. Supports partial document updates (merge fields) or script-based updates for more complex modifications. Unlike indexing, this only modifies specified fields without replacing the entire document.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      indexName: z.string().describe('Name of the index containing the document'),
      documentId: z.string().describe('ID of the document to update'),
      partialDocument: z
        .record(z.string(), z.any())
        .optional()
        .describe('Partial document fields to merge into the existing document'),
      script: z
        .object({
          source: z.string().describe('The script source code'),
          lang: z.string().optional().describe('Script language (default: painless)'),
          params: z
            .record(z.string(), z.any())
            .optional()
            .describe('Parameters to pass to the script')
        })
        .optional()
        .describe('Script-based update for complex modifications')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('The index containing the updated document'),
      documentId: z.string().describe('The ID of the updated document'),
      version: z.number().describe('The new document version after update'),
      result: z.string().describe('The result of the operation (updated or noop)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    if (!ctx.input.partialDocument && !ctx.input.script) {
      throw elasticsearchServiceError('Either partialDocument or script must be provided');
    }

    let scriptParam = ctx.input.script
      ? {
          source: ctx.input.script.source,
          lang: ctx.input.script.lang,
          params: ctx.input.script.params
        }
      : undefined;

    let result = await client.updateDocument(
      ctx.input.indexName,
      ctx.input.documentId,
      ctx.input.partialDocument || {},
      scriptParam
    );

    return {
      output: {
        indexName: result._index,
        documentId: result._id,
        version: result._version,
        result: result.result
      },
      message: `Document **${result._id}** in index **${result._index}** ${result.result} (version ${result._version}).`
    };
  })
  .build();
