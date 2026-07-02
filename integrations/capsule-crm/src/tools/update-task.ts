import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Capsule CRM. Modify its description, details, due date, status, and assignment.`
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      description: z.string().optional().describe('Updated description'),
      detail: z.string().optional().describe('Updated details'),
      dueOn: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      dueTime: z.string().optional().describe('Updated due time (HH:MM:SS)'),
      status: z.enum(['open', 'completed']).optional().describe('Updated status'),
      ownerId: z.number().optional().describe('New owner user ID')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the updated task'),
      description: z.string().optional().describe('Task description'),
      updatedAt: z.string().optional().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let task: Record<string, any> = {};

    if (ctx.input.description !== undefined) task.description = ctx.input.description;
    if (ctx.input.detail !== undefined) task.detail = ctx.input.detail;
    if (ctx.input.dueOn !== undefined) task.dueOn = ctx.input.dueOn;
    if (ctx.input.dueTime !== undefined) task.dueTime = ctx.input.dueTime;
    if (ctx.input.status !== undefined) task.status = ctx.input.status;
    if (ctx.input.ownerId) task.owner = { id: ctx.input.ownerId };

    let result = await client.updateTask(ctx.input.taskId, task);

    return {
      output: {
        taskId: result.id,
        description: result.description,
        updatedAt: result.updatedAt
      },
      message: `Updated task **"${result.description ?? `#${result.id}`}"**.`
    };
  })
  .build();
