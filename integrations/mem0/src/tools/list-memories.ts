import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMemories = SlateTool.create(spec, {
  name: 'List Memories',
  key: 'list_memories',
  description: `Retrieve all memories with optional filtering by user, agent, app, or session. Supports pagination for large result sets. Use this to browse stored memories rather than searching by semantic similarity.`,
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
      userId: z.string().optional().describe('Filter memories by user ID'),
      agentId: z.string().optional().describe('Filter memories by agent ID'),
      appId: z.string().optional().describe('Filter memories by app ID'),
      runId: z.string().optional().describe('Filter memories by run/session ID'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      pageSize: z.number().optional().describe('Number of items per page (default: 100)')
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
            metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
            categories: z.array(z.string()).optional().describe('Memory categories'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of memories'),
      totalMemories: z.number().describe('Total number of memories matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
    });

    let result = await client.listMemories({
      userId: ctx.input.userId,
      agentId: ctx.input.agentId,
      appId: ctx.input.appId,
      runId: ctx.input.runId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let memories = result.memories.map((m: Record<string, unknown>) => ({
      memoryId: String(m.id || ''),
      memory: String(m.memory || ''),
      userId: m.user_id ? String(m.user_id) : undefined,
      agentId: m.agent_id ? String(m.agent_id) : undefined,
      appId: m.app_id ? String(m.app_id) : undefined,
      runId: m.run_id ? String(m.run_id) : undefined,
      metadata: m.metadata as Record<string, unknown> | undefined,
      categories: Array.isArray(m.categories) ? m.categories.map(String) : undefined,
      createdAt: m.created_at ? String(m.created_at) : undefined,
      updatedAt: m.updated_at ? String(m.updated_at) : undefined
    }));

    return {
      output: { memories, totalMemories: result.totalMemories },
      message: `Retrieved **${memories.length}** of ${result.totalMemories} total memories.`
    };
  })
  .build();
