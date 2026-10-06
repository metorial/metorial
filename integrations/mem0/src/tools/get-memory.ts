import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, mapMemory } from '../lib/client';
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
      memoryId: z
        .string()
        .trim()
        .min(1)
        .describe('Unique identifier of the memory to retrieve'),
      includeHistory: z
        .boolean()
        .optional()
        .describe('Whether to include the full change history of the memory')
    })
  )
  .output(
    z.object({
      memoryId: z.string().trim().min(1).describe('Unique memory identifier'),
      memory: z.string().describe('Memory content text'),
      userId: z.string().trim().min(1).optional().describe('Associated user ID'),
      agentId: z.string().trim().min(1).optional().describe('Associated agent ID'),
      appId: z.string().trim().min(1).optional().describe('Associated app ID'),
      runId: z.string().trim().min(1).optional().describe('Associated run ID'),
      hash: z.string().trim().min(1).optional().describe('Content hash'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
      createdAt: z.string().trim().min(1).optional().describe('Creation timestamp'),
      updatedAt: z.string().trim().min(1).optional().describe('Last update timestamp'),
      expirationDate: z
        .string()
        .optional()
        .describe('Date after which the memory is hidden from search'),
      history: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full change history of the memory')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let mem = await client.getMemory(ctx.input.memoryId);

    let history: Record<string, unknown>[] | undefined;
    if (ctx.input.includeHistory) {
      history = await client.getMemoryHistory(ctx.input.memoryId);
    }

    return {
      output: {
        ...mapMemory(mem),
        history
      },
      message: `Retrieved memory **${ctx.input.memoryId}**: "${String(mem.memory || '').substring(0, 100)}${String(mem.memory || '').length > 100 ? '...' : ''}"${history ? ` with ${history.length} history entries` : ''}.`
    };
  })
  .build();
