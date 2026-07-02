import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task **${ctx.input.taskId}**`
    };
  })
  .build();
