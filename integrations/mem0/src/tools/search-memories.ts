import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchMemories = SlateTool.create(spec, {
  name: 'Search Memories',
  key: 'search_memories',
  description: `Search memories using natural language queries with semantic similarity matching. Uses the v2 search API with support for advanced filtering using AND, OR, IN, comparison operators, and field-level filters.
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
      query: z.string().describe('Natural language search query'),
      userId: z.string().optional().describe('Filter memories by user ID'),
      agentId: z.string().optional().describe('Filter memories by agent ID'),
      appId: z.string().optional().describe('Filter memories by app ID'),
      runId: z.string().optional().describe('Filter memories by run/session ID'),
      topK: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 10)'),
      threshold: z
        .number()
        .optional()
        .describe('Minimum similarity score threshold (default: 0.3)'),
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
        .describe('Specific fields to include in the response')
    })
  )
  .output(
    z.object({
      memories: z
        .array(
          z.object({
            memoryId: z.string().describe('Unique memory identifier'),
            memory: z.string().describe('Memory content text'),
            userId: z.string().optional().describe('Associated user ID'),
            agentId: z.string().optional().describe('Associated agent ID'),
            appId: z.string().optional().describe('Associated app ID'),
            runId: z.string().optional().describe('Associated run ID'),
            score: z.number().optional().describe('Similarity score'),
            metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
            categories: z.array(z.string()).optional().describe('Memory categories'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Search results ranked by relevance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
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
      fields: ctx.input.fields
    });

    let resultArray = Array.isArray(results) ? results : [];
    let memories = resultArray.map((m: Record<string, unknown>) => ({
      memoryId: String(m.id || ''),
      memory: String(m.memory || ''),
      userId: m.user_id ? String(m.user_id) : undefined,
      agentId: m.agent_id ? String(m.agent_id) : undefined,
      appId: m.app_id ? String(m.app_id) : undefined,
      runId: m.run_id ? String(m.run_id) : undefined,
      score: typeof m.score === 'number' ? m.score : undefined,
      metadata: m.metadata as Record<string, unknown> | undefined,
      categories: Array.isArray(m.categories) ? m.categories.map(String) : undefined,
      createdAt: m.created_at ? String(m.created_at) : undefined,
      updatedAt: m.updated_at ? String(m.updated_at) : undefined
    }));

    return {
      output: { memories },
      message: `Found **${memories.length}** memories matching "${ctx.input.query}".`
    };
  })
  .build();
