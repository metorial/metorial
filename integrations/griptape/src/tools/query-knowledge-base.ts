import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryKnowledgeBase = SlateTool.create(spec, {
  name: 'Query Knowledge Base',
  key: 'query_knowledge_base',
  description: `Query or search a Griptape Cloud Knowledge Base using natural language. Knowledge Bases are collections of Data Sources that your LLM-powered applications can retrieve information from using RAG (Retrieval-Augmented Generation). Use query to retrieve relevant entries or search to return the provider search result.`,
  instructions: [
    'Use action "query" to retrieve relevant entries with optional query arguments.',
    'Use action "search" to return the knowledge base search result.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['query', 'search'])
        .describe(
          'Whether to retrieve entries with query or use the provider search operation'
        ),
      knowledgeBaseId: z.string().describe('ID of the knowledge base to query'),
      query: z.string().describe('Natural language query string'),
      queryArgs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional query arguments for query or search')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Query or search results from the knowledge base')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let results: any;
    if (ctx.input.action === 'query') {
      results = await client.queryKnowledgeBase(
        ctx.input.knowledgeBaseId,
        ctx.input.query,
        ctx.input.queryArgs
      );
    } else {
      results = await client.searchKnowledgeBase(
        ctx.input.knowledgeBaseId,
        ctx.input.query,
        ctx.input.queryArgs
      );
    }

    return {
      output: { results },
      message: `Performed ${ctx.input.action} on knowledge base ${ctx.input.knowledgeBaseId}.`
    };
  })
  .build();
