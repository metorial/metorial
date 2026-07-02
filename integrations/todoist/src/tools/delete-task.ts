import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from Todoist. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to delete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Deleted task ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTask(ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId
      },
      message: `Deleted task (ID: ${ctx.input.taskId}).`
    };
  });
