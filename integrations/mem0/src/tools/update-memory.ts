import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, mapMemory } from '../lib/client';
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
      memoryId: z.string().trim().min(1).describe('Unique identifier of the memory to update'),
      text: z.string().trim().min(1).optional().describe('New text content for the memory'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated metadata key-value pairs'),
      expirationDate: z.iso
        .date()
        .nullable()
        .optional()
        .describe('Expiration date in YYYY-MM-DD format; null clears expiration')
    })
  )
  .output(
    z.object({
      memoryId: z.string().trim().min(1).describe('Unique identifier of the updated memory'),
      memory: z.string().describe('Updated memory content'),
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
        .describe('Date after which the memory is hidden from search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let result = await client.updateMemory({
      memoryId: ctx.input.memoryId,
      text: ctx.input.text,
      metadata: ctx.input.metadata,
      expirationDate: ctx.input.expirationDate
    });

    return {
      output: {
        ...mapMemory(result)
      },
      message: `Updated memory **${ctx.input.memoryId}** successfully.`
    };
  })
  .build();
