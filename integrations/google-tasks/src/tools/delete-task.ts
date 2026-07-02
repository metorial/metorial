import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from a task list. This action cannot be undone.`,
  instructions: [
    'If the task has assignments in Docs or Chat Spaces, both the assigned and original versions will be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(googleTasksActionScopes.deleteTask)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list containing the task'),
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    await client.deleteTask(ctx.input.taskListId, ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task \`${ctx.input.taskId}\`.`
    };
  })
  .build();
