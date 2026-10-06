import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, mapMemory } from '../lib/client';
import { spec } from '../spec';

export let listMemories = SlateTool.create(spec, {
  name: 'List Memories',
  key: 'list_memories',
  description: `Retrieve one page of memories scoped to a user, agent, app, or session. Supports advanced filters and pagination. Use this to browse stored memories rather than searching by relevance.`,
  instructions: [
    'Use scope filters (userId, agentId, etc.) to narrow down results.',
    'Use page and pageSize for pagination through large sets of memories.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().trim().min(1).optional().describe('Filter memories by user ID'),
      agentId: z.string().trim().min(1).optional().describe('Filter memories by agent ID'),
      appId: z.string().trim().min(1).optional().describe('Filter memories by app ID'),
      runId: z.string().trim().min(1).optional().describe('Filter memories by run/session ID'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number for pagination (default: 1)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Number of items per page (1-200; default: 100)'),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Advanced entity and metadata filters. Requires a positive entity scope, or combine with userId, agentId, appId, or runId.'
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
            metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
            categories: z.array(z.string()).optional().describe('Memory categories'),
            createdAt: z.string().trim().min(1).optional().describe('Creation timestamp'),
            updatedAt: z.string().trim().min(1).optional().describe('Last update timestamp')
          })
        )
        .describe('List of memories'),
      totalMemories: z.number().describe('Total number of memories matching the filters'),
      next: z
        .string()
        .optional()
        .describe('Provider URL for the next page; increment page to continue'),
      previous: z.string().optional().describe('Provider URL for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let result = await client.listMemories({
      userId: ctx.input.userId,
      agentId: ctx.input.agentId,
      appId: ctx.input.appId,
      runId: ctx.input.runId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      filters: ctx.input.filters,
      showExpired: ctx.input.showExpired
    });

    let memories = result.memories.map(mapMemory);

    return {
      output: {
        memories,
        totalMemories: result.totalMemories,
        next: result.next,
        previous: result.previous
      },
      message: `Retrieved **${memories.length}** of ${result.totalMemories} total memories.`
    };
  })
  .build();
