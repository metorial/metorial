import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, mapMemory } from '../lib/client';
import { spec } from '../spec';

export let searchMemories = SlateTool.create(spec, {
  name: 'Search Memories',
  key: 'search_memories',
  description: `Search memories using natural language queries with hybrid semantic, keyword, and entity matching. Uses the V3 search API with support for advanced filtering using AND, OR, NOT, comparison operators, and field-level filters.
Returns ranked results based on relevance to the query.`,
  instructions: [
    'Provide a natural language query describing what you want to find.',
    'Use filters for advanced filtering with operators like AND, OR, gte, lte, etc.',
    'Scope results by providing userId, agentId, appId, or runId.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().trim().min(1).describe('Natural language search query'),
      userId: z.string().trim().min(1).optional().describe('Filter memories by user ID'),
      agentId: z.string().trim().min(1).optional().describe('Filter memories by agent ID'),
      appId: z.string().trim().min(1).optional().describe('Filter memories by app ID'),
      runId: z.string().trim().min(1).optional().describe('Filter memories by run/session ID'),
      topK: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of results to return (default: 10)'),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Minimum relevance score threshold (default: 0.1). Set 0 to disable filtering.'
        ),
      rerank: z
        .boolean()
        .optional()
        .describe('Whether to rerank results for improved relevance'),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Advanced filters with operators (AND, OR, IN, gte, lte, gt, lt, ne, icontains)'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to include in the response; id and memory are always retained'
        ),
      showExpired: z.boolean().optional().describe('Include expired memories (default: false)')
    })
  )
  .output(
    z.object({
      memories: z
        .array(
          z.object({
            memoryId: z.string().trim().min(1).describe('Unique memory identifier'),
            memory: z.string().describe('Memory content text'),
            userId: z.string().trim().min(1).optional().describe('Associated user ID'),
            agentId: z.string().trim().min(1).optional().describe('Associated agent ID'),
            appId: z.string().trim().min(1).optional().describe('Associated app ID'),
            runId: z.string().trim().min(1).optional().describe('Associated run ID'),
            score: z.number().optional().describe('Similarity score'),
            metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
            categories: z.array(z.string()).optional().describe('Memory categories'),
            createdAt: z.string().trim().min(1).optional().describe('Creation timestamp'),
            updatedAt: z.string().trim().min(1).optional().describe('Last update timestamp')
          })
        )
        .describe('Search results ranked by relevance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let results = await client.searchMemories({
      query: ctx.input.query,
      userId: ctx.input.userId,
      agentId: ctx.input.agentId,
      appId: ctx.input.appId,
      runId: ctx.input.runId,
      topK: ctx.input.topK,
      threshold: ctx.input.threshold,
      rerank: ctx.input.rerank,
      filters: ctx.input.filters,
      fields: ctx.input.fields,
      showExpired: ctx.input.showExpired
    });

    let memories = results.map(mapMemory);

    return {
      output: { memories },
      message: `Found **${memories.length}** memories matching "${ctx.input.query}".`
    };
  })
  .build();
