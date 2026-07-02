import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMemory = SlateTool.create(spec, {
  name: 'Update Memory',
  key: 'update_memory',
  description: `Update an existing memory's text content or metadata. Changes are versioned and tracked in the memory's history.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memoryId: z.string().describe('Unique identifier of the memory to update'),
      text: z.string().optional().describe('New text content for the memory'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated metadata key-value pairs')
    })
  )
  .output(
    z.object({
      memoryId: z.string().describe('Unique identifier of the updated memory'),
      memory: z.string().describe('Updated memory content'),
      userId: z.string().optional().describe('Associated user ID'),
      agentId: z.string().optional().describe('Associated agent ID'),
      appId: z.string().optional().describe('Associated app ID'),
      runId: z.string().optional().describe('Associated run ID'),
      hash: z.string().optional().describe('Content hash'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Memory metadata'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
    });

    let result = (await client.updateMemory({
      memoryId: ctx.input.memoryId,
      text: ctx.input.text,
      metadata: ctx.input.metadata
    })) as Record<string, unknown>;

    return {
      output: {
        memoryId: String(result.id || ctx.input.memoryId),
        memory: String(result.text || result.memory || ''),
        userId: result.user_id ? String(result.user_id) : undefined,
        agentId: result.agent_id ? String(result.agent_id) : undefined,
        appId: result.app_id ? String(result.app_id) : undefined,
        runId: result.run_id ? String(result.run_id) : undefined,
        hash: result.hash ? String(result.hash) : undefined,
        metadata: result.metadata as Record<string, unknown> | undefined,
        createdAt: result.created_at ? String(result.created_at) : undefined,
        updatedAt: result.updated_at ? String(result.updated_at) : undefined
      },
      message: `Updated memory **${ctx.input.memoryId}** successfully.`
    };
  })
  .build();
