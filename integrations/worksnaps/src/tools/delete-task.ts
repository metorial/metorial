import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from a project. This removes the task and any associated task assignments.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project containing the task'),
      taskId: z.string().describe('The ID of the task to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteTask(ctx.input.projectId, ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task **${ctx.input.taskId}** from project **${ctx.input.projectId}**.`
    };
  })
  .build();
