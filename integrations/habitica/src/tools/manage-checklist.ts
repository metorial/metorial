import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/task';
import { spec } from '../spec';

export let manageChecklist = SlateTool.create(spec, {
  name: 'Manage Checklist',
  key: 'manage_checklist',
  description:
    'Add, update, toggle completion, or remove an individual checklist item on a Habitica Daily or To-Do. Returns the updated task and checklist item IDs.',
  instructions: [
    'Call get_task or list_tasks to discover task and checklist item IDs.',
    'Provide text for add and update. Provide itemId for update, score, and delete.',
    'Score toggles the item completion state. Use update with completed to set an explicit state.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'score', 'delete']).describe('Checklist action'),
      taskId: z
        .string()
        .describe('Daily or To-Do ID or alias, discoverable with get_task or list_tasks'),
      itemId: z
        .string()
        .optional()
        .describe(
          'Checklist item ID from get_task or list_tasks; required for update, score, and delete'
        ),
      text: z.string().optional().describe('Checklist item text; required for add and update'),
      completed: z
        .boolean()
        .optional()
        .describe(
          'Explicit completion state for add or update; omit to retain the state when updating'
        )
    })
  )
  .output(
    z.object({ task: taskOutputSchema.describe('Updated task, including its checklist') })
  )
  .handleInvocation(async ctx => {
    let { action, taskId, itemId, text, completed } = ctx.input;
    if ((action === 'add' || action === 'update') && !text?.trim()) {
      throw createApiServiceError('Provide non-empty text for add or update.');
    }
    if (action === 'add' && itemId !== undefined) {
      throw createApiServiceError('itemId applies only to update, score, and delete.');
    }
    if (action !== 'add' && !itemId?.trim()) {
      throw createApiServiceError(
        'Provide an itemId from get_task or list_tasks for update, score, or delete.'
      );
    }
    if (
      (action === 'score' || action === 'delete') &&
      (text !== undefined || completed !== undefined)
    ) {
      throw createApiServiceError('text and completed apply only to add and update.');
    }
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient:
        ctx.auth.xClient ??
        (typeof ctx.config.xClient === 'string' ? ctx.config.xClient : undefined)
    });
    let task: Record<string, any>;
    if (action === 'add') {
      task = await client.addChecklistItem(taskId, text!, completed);
    } else if (action === 'update') {
      task = await client.updateChecklistItem(taskId, itemId!, text!, completed);
    } else if (action === 'score') {
      task = await client.scoreChecklistItem(taskId, itemId!);
    } else {
      task = await client.deleteChecklistItem(taskId, itemId!);
    }
    return {
      output: { task: mapTask(task) },
      message: `Checklist action **${action}** completed for task **${task.text}**`
    };
  })
  .build();
