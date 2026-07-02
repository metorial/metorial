import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageQueueTool = SlateTool.create(spec, {
  name: 'Manage Queue',
  key: 'manage_queue',
  description: `Manage the posting queue for a profile. Supports reordering updates, shuffling the queue randomly, or moving a specific update to the top.`,
  instructions: [
    'Use `action: "reorder"` with an `order` array to set a specific order for queued updates.',
    'Use `action: "shuffle"` to randomly reorder all queued updates.',
    'Use `action: "move_to_top"` with `updateId` to move a single update to the front of the queue.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['reorder', 'shuffle', 'move_to_top'])
        .describe('Queue management action to perform'),
      profileId: z
        .string()
        .optional()
        .describe('Profile ID. Required for reorder and shuffle actions.'),
      updateId: z.string().optional().describe('Update ID. Required for move_to_top action.'),
      order: z
        .array(z.string())
        .optional()
        .describe('Ordered array of update IDs for the reorder action'),
      offset: z.number().optional().describe('Offset for reorder pagination')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action completed successfully'),
      updatedUpdateIds: z
        .array(z.string())
        .describe('IDs of updates in the resulting queue order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'move_to_top') {
      if (!ctx.input.updateId) throw new Error('updateId is required for move_to_top action');
      let result = await client.moveUpdateToTop(ctx.input.updateId);
      return {
        output: {
          success: result.success,
          updatedUpdateIds: result.update ? [result.update.id] : []
        },
        message: `Moved update **${ctx.input.updateId}** to the top of the queue.`
      };
    }

    if (!ctx.input.profileId)
      throw new Error('profileId is required for reorder and shuffle actions');

    if (action === 'shuffle') {
      let result = await client.shuffleUpdates(ctx.input.profileId);
      let ids = (result.updates || []).map(u => u.id);
      return {
        output: {
          success: result.success,
          updatedUpdateIds: ids
        },
        message: `Shuffled **${ids.length}** updates in the queue.`
      };
    }

    // reorder
    if (!ctx.input.order || ctx.input.order.length === 0) {
      throw new Error('order array is required for reorder action');
    }
    let result = await client.reorderUpdates(ctx.input.profileId, ctx.input.order, {
      offset: ctx.input.offset
    });
    let ids = (result.updates || []).map(u => u.id);
    return {
      output: {
        success: result.success,
        updatedUpdateIds: ids
      },
      message: `Reordered **${ids.length}** updates in the queue.`
    };
  })
  .build();
