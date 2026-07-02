import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from Motion. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the deleted task'),
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    await client.deleteTask(ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        deleted: true
      },
      message: `Deleted task \`${ctx.input.taskId}\``
    };
  })
  .build();
