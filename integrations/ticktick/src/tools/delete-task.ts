import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from TickTick. Requires both the task ID and the project ID the task belongs to. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to delete'),
      projectId: z.string().describe('ID of the project the task belongs to')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the deleted task'),
      projectId: z.string().describe('ID of the project'),
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTask(ctx.input.projectId, ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        projectId: ctx.input.projectId,
        deleted: true
      },
      message: `Deleted task \`${ctx.input.taskId}\` from project \`${ctx.input.projectId}\`.`
    };
  })
  .build();
