import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task GID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task ${ctx.input.taskId}.`
    };
  })
  .build();
