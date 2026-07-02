import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMemory = SlateTool.create(spec, {
  name: 'Get Memory',
  key: 'get_memory',
  description: `Retrieve a specific memory by its ID, optionally including its full change history. Use this to inspect a single memory's content, metadata, and version history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      memoryId: z.string().describe('Unique identifier of the memory to retrieve'),
      includeHistory: z
        .boolean()
        .optional()
        .describe('Whether to include the full change history of the memory')
    })
  )
  .output(
    z.object({
      memoryId: z.string().describe('Unique memory identifier'),
      memory: z.string().describe('Memory content text'),
      userId: z.string().optional().describe('Associated user ID'),
      agentId: z.string().optional().describe('Associated agent ID'),
      appId: z.string().optional().describe('Associated app ID'),
      runId: z.string().optional().describe('Associated run ID'),
      hash: z.string().optional().describe('Content hash'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      history: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full change history of the memory')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
    });

    let mem = (await client.getMemory(ctx.input.memoryId)) as Record<string, unknown>;

    let history: Record<string, unknown>[] | undefined;
    if (ctx.input.includeHistory) {
      let historyResult = await client.getMemoryHistory(ctx.input.memoryId);
      history = historyResult as Record<string, unknown>[];
    }

    return {
      output: {
        memoryId: String(mem.id || ''),
        memory: String(mem.memory || ''),
        userId: mem.user_id ? String(mem.user_id) : undefined,
        agentId: mem.agent_id ? String(mem.agent_id) : undefined,
        appId: mem.app_id ? String(mem.app_id) : undefined,
        runId: mem.run_id ? String(mem.run_id) : undefined,
        hash: mem.hash ? String(mem.hash) : undefined,
        metadata: mem.metadata as Record<string, unknown> | undefined,
        createdAt: mem.created_at ? String(mem.created_at) : undefined,
        updatedAt: mem.updated_at ? String(mem.updated_at) : undefined,
        history
      },
      message: `Retrieved memory **${ctx.input.memoryId}**: "${String(mem.memory || '').substring(0, 100)}${String(mem.memory || '').length > 100 ? '...' : ''}"${history ? ` with ${history.length} history entries` : ''}.`
    };
  })
  .build();
