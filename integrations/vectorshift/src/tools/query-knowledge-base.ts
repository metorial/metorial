import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, queryKnowledgeBase } from '../lib/client';
import { spec } from '../spec';

export let queryKnowledgeBaseTool = SlateTool.create(spec, {
  name: 'Query Knowledge Base',
  key: 'query_knowledge_base',
  description: `Perform semantic search queries against a knowledge base. Returns the most relevant document chunks matching your queries. Supports multiple queries in a single request with optional context, result limits, reranking, and query transformation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the knowledge base to query'),
      queries: z
        .array(z.string())
        .describe('Search queries to run against the knowledge base'),
      context: z
        .string()
        .optional()
        .describe('Additional context to improve search relevance'),
      topK: z.number().optional().describe('Maximum number of results to return per query'),
      rerankDocuments: z
        .boolean()
        .optional()
        .describe('Re-rank results for improved relevance'),
      transformQuery: z.boolean().optional().describe('Transform query for better matching')
    })
  )
  .output(
    z.object({
      results: z
        .unknown()
        .describe('Search results with matching document chunks and relevance scores')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await queryKnowledgeBase(api, ctx.input.knowledgeBaseId, {
      queries: ctx.input.queries,
      context: ctx.input.context,
      topK: ctx.input.topK,
      rerankDocuments: ctx.input.rerankDocuments,
      transformQuery: ctx.input.transformQuery
    });

    return {
      output: {
        results: result.result ?? result
      },
      message: `Query completed against knowledge base \`${ctx.input.knowledgeBaseId}\` with **${ctx.input.queries.length}** query/queries.`
    };
  })
  .build();
