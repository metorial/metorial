import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteTaskList = SlateTool.create(spec, {
  name: 'Delete Task List',
  key: 'delete_task_list',
  description: `Permanently delete a task list and all tasks within it. This action cannot be undone.`,
  instructions: [
    'If the list contains tasks assigned from Docs or Chat Spaces, both the assigned tasks and the originals will be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(googleTasksActionScopes.deleteTaskList)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task list was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    await client.deleteTaskList(ctx.input.taskListId);

    return {
      output: { deleted: true },
      message: `Deleted task list \`${ctx.input.taskListId}\`.`
    };
  })
  .build();
