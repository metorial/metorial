import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Delete a task from Wrike. The task is moved to the recycle bin and can be restored within 30 days.`,
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
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task ${ctx.input.taskId}.`
    };
  })
  .build();
