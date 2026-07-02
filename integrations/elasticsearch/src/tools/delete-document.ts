import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDocumentTool = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Remove a document from an Elasticsearch index by its ID. Returns the result of the deletion operation.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      indexName: z.string().describe('Name of the index containing the document'),
      documentId: z.string().describe('ID of the document to delete')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('The index the document was deleted from'),
      documentId: z.string().describe('The ID of the deleted document'),
      version: z.number().describe('The document version after deletion'),
      result: z.string().describe('The result of the operation (deleted or not_found)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let result = await client.deleteDocument(ctx.input.indexName, ctx.input.documentId);

    return {
      output: {
        indexName: result._index,
        documentId: result._id,
        version: result._version,
        result: result.result
      },
      message: `Document **${result._id}** ${result.result} from index **${result._index}**.`
    };
  })
  .build();
