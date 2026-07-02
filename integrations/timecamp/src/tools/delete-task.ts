import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Delete a task or project from TimeCamp by its ID. This action is permanent. Deleting a project will also affect its subtasks.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task or project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTask(ctx.input.taskId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted task **${ctx.input.taskId}**.`
    };
  })
  .build();
