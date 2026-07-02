import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubtasksTool = SlateTool.create(spec, {
  name: 'Manage Subtasks',
  key: 'manage_subtasks',
  description: `Create, update, or delete subtasks on a card. Subtasks break down complex work items into smaller activities that can be assigned and tracked independently.`
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the parent card'),
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      subtaskId: z.number().optional().describe('Subtask ID (required for update and delete)'),
      description: z.string().optional().describe('Subtask description (required for create)'),
      ownerUserId: z.number().optional().describe('User ID to assign the subtask to'),
      isFinished: z.boolean().optional().describe('Whether the subtask is finished')
    })
  )
  .output(
    z.object({
      subtaskId: z.number().optional().describe('Subtask ID'),
      description: z.string().optional().nullable().describe('Subtask description'),
      ownerUserId: z.number().optional().nullable().describe('Assigned user ID'),
      isFinished: z.number().optional().describe('Whether the subtask is finished (0 or 1)'),
      deleted: z.boolean().optional().describe('Whether the subtask was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.description)
        throw new Error('Description is required to create a subtask.');
      let subtask = await client.createSubtask(ctx.input.cardId, {
        description: ctx.input.description,
        ownerUserId: ctx.input.ownerUserId,
        isFinished: ctx.input.isFinished ? 1 : 0
      });
      return {
        output: {
          subtaskId: subtask?.subtask_id,
          description: subtask?.description,
          ownerUserId: subtask?.owner_user_id,
          isFinished: subtask?.is_finished
        },
        message: `Created subtask on card **${ctx.input.cardId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.subtaskId) throw new Error('subtaskId is required to update a subtask.');
      let subtask = await client.updateSubtask(ctx.input.cardId, ctx.input.subtaskId, {
        description: ctx.input.description,
        ownerUserId: ctx.input.ownerUserId,
        isFinished:
          ctx.input.isFinished !== undefined ? (ctx.input.isFinished ? 1 : 0) : undefined
      });
      return {
        output: {
          subtaskId: subtask?.subtask_id ?? ctx.input.subtaskId,
          description: subtask?.description,
          ownerUserId: subtask?.owner_user_id,
          isFinished: subtask?.is_finished
        },
        message: `Updated subtask **${ctx.input.subtaskId}** on card **${ctx.input.cardId}**.`
      };
    }

    // delete
    if (!ctx.input.subtaskId) throw new Error('subtaskId is required to delete a subtask.');
    await client.deleteSubtask(ctx.input.cardId, ctx.input.subtaskId);
    return {
      output: {
        subtaskId: ctx.input.subtaskId,
        deleted: true
      },
      message: `Deleted subtask **${ctx.input.subtaskId}** from card **${ctx.input.cardId}**.`
    };
  })
  .build();
