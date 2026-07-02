import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryRetriever = SlateTool.create(spec, {
  name: 'Query Retriever',
  key: 'query_retriever',
  description: `Query a Griptape Cloud Retriever for RAG (Retrieval-Augmented Generation) results. Retrievers support queries across multiple Knowledge Bases with reranking, providing a unified search interface over your data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      retrieverId: z.string().describe('ID of the retriever to query'),
      query: z.string().describe('Natural language query string'),
      queryArgs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional query arguments')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Query results from the retriever')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let results = await client.queryRetriever(
      ctx.input.retrieverId,
      ctx.input.query,
      ctx.input.queryArgs
    );

    return {
      output: { results },
      message: `Queried retriever ${ctx.input.retrieverId}.`
    };
  })
  .build();
