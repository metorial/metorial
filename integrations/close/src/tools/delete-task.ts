import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description:
    'Delete a Close task by ID. Retrieve it with get_tasks first to confirm the intended task.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ taskId: z.string() }))
  .output(z.object({ taskId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteTask(ctx.input.taskId);
    return {
      output: { taskId: ctx.input.taskId, deleted: true },
      message: `Deleted task **${ctx.input.taskId}**.`
    };
  })
  .build();
