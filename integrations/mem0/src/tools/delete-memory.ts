import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMemory = SlateTool.create(spec, {
  name: 'Delete Memories',
  key: 'delete_memories',
  description: `Delete one or more memories. You can delete a single memory by its ID, or bulk-delete all memories matching a scope filter (user, agent, app, or run).
When using bulk delete, at least one scope filter is required.`,
  instructions: [
    'To delete a single memory, provide its memoryId.',
    'To bulk-delete, provide one or more scope filters (userId, agentId, appId, runId) without a memoryId.',
    'Bulk delete requires at least one filter - you cannot delete all memories without any filter.'
  ],
  constraints: ['Bulk deletion requires at least one scope filter parameter.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      memoryId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Specific memory ID to delete. If provided, deletes only this memory.'),
      userId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Delete all memories for this user ID'),
      agentId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Delete all memories for this agent ID'),
      appId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Delete all memories for this app ID'),
      runId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Delete all memories for this run/session ID')
    })
  )
  .output(
    z.object({
      deleted: z
        .boolean()
        .describe('Whether deletion has completed; false while processing is pending'),
      scope: z.string().describe('Description of the deletion scope'),
      eventId: z
        .string()
        .optional()
        .describe('Processing event ID. Call get_event to check completion.'),
      status: z.string().optional().describe('Processing status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    if (ctx.input.memoryId) {
      if (ctx.input.userId || ctx.input.agentId || ctx.input.appId || ctx.input.runId) {
        throw createApiServiceError(
          'Provide memoryId for a single deletion or entity scope filters for bulk deletion, not both.',
          { reason: 'mem0_conflicting_delete_scope' }
        );
      }
      await client.deleteMemory(ctx.input.memoryId);
      return {
        output: {
          deleted: true,
          scope: `memory ${ctx.input.memoryId}`,
          status: 'SUCCEEDED'
        },
        message: `Deleted memory **${ctx.input.memoryId}**.`
      };
    }

    let result = await client.deleteMemories({
      userId: ctx.input.userId,
      agentId: ctx.input.agentId,
      appId: ctx.input.appId,
      runId: ctx.input.runId
    });

    let scopeParts: string[] = [];
    if (ctx.input.userId) scopeParts.push(`user: ${ctx.input.userId}`);
    if (ctx.input.agentId) scopeParts.push(`agent: ${ctx.input.agentId}`);
    if (ctx.input.appId) scopeParts.push(`app: ${ctx.input.appId}`);
    if (ctx.input.runId) scopeParts.push(`run: ${ctx.input.runId}`);

    let scopeDesc = scopeParts.join(', ');

    return {
      output: {
        deleted: result.status === 'SUCCEEDED',
        scope: scopeDesc,
        eventId: result.eventId,
        status: result.status
      },
      message:
        result.status === 'SUCCEEDED'
          ? `Deleted all memories matching scope: ${scopeDesc}.`
          : `Deletion requested for scope: ${scopeDesc}. Call get_event with eventId ${result.eventId} to check completion.`
    };
  })
  .build();
