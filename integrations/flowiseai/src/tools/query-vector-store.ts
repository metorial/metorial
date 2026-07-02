import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let queryVectorStore = SlateTool.create(spec, {
  name: 'Query Vector Store',
  key: 'query_vector_store',
  description: `Perform a semantic search query against a document store's vector store. Returns matching documents based on vector similarity to the query.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      storeId: z.string().describe('ID of the document store to query'),
      query: z.string().describe('Semantic search query text')
    })
  )
  .output(
    z.object({
      timeTaken: z.number().optional().describe('Time taken for the query in milliseconds'),
      docs: z.array(z.any()).describe('Matching documents from the vector store')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.queryDocumentStoreVectorStore({
      storeId: ctx.input.storeId,
      query: ctx.input.query
    });

    return {
      output: {
        timeTaken: result.timeTaken,
        docs: result.docs || []
      },
      message: `Query returned **${(result.docs || []).length}** document(s) in ${result.timeTaken}ms.`
    };
  })
  .build();
