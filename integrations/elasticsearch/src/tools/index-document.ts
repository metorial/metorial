import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let indexDocumentTool = SlateTool.create(spec, {
  name: 'Index Document',
  key: 'index_document',
  description: `Create or replace a document in an Elasticsearch index. Provide JSON document content and optionally specify a document ID. If no ID is provided, Elasticsearch will auto-generate one. If an ID is provided and a document already exists with that ID, it will be replaced.`,
  instructions: [
    'Use this tool to write one JSON document, including when an existing ingest pipeline should process it.',
    'Pass the existing ingest pipeline name in the "pipeline" field; do not use manage_pipeline merely because an indexing request names a pipeline.',
    'Use get_document and list_indices only for read-only requests; they do not index document content.',
    'Use bulk_operations instead when the user asks to write multiple documents.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      indexName: z.string().describe('Name of the index to store the document in'),
      documentId: z
        .string()
        .optional()
        .describe('Optional document ID. If omitted, Elasticsearch auto-generates one'),
      document: z.record(z.string(), z.any()).describe('The JSON document body to index'),
      pipeline: z
        .string()
        .optional()
        .describe('Optional ingest pipeline to pre-process the document')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('The index the document was stored in'),
      documentId: z.string().describe('The ID of the indexed document'),
      version: z.number().describe('The document version'),
      result: z.string().describe('The result of the operation (created or updated)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let result = await client.indexDocument(
      ctx.input.indexName,
      ctx.input.document,
      ctx.input.documentId,
      ctx.input.pipeline
    );

    return {
      output: {
        indexName: result._index,
        documentId: result._id,
        version: result._version,
        result: result.result
      },
      message: `Document **${result._id}** ${result.result} in index **${result._index}** (version ${result._version}).`
    };
  })
  .build();
