import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from Nozbe Teams. This removes the task and all its associated comments and attachments.`,
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
      taskId: z.string().describe('ID of the deleted task'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTask(ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        deleted: true
      },
      message: `Deleted task **${ctx.input.taskId}**.`
    };
  })
  .build();
