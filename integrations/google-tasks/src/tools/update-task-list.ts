import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateTaskList = SlateTool.create(spec, {
  name: 'Update Task List',
  key: 'update_task_list',
  description: `Update the title of an existing task list. Provide the task list ID and the new title.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleTasksActionScopes.updateTaskList)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list to update'),
      title: z.string().describe('New title for the task list (max 1024 characters)')
    })
  )
  .output(
    z.object({
      taskListId: z.string().describe('ID of the updated task list'),
      title: z.string().describe('Updated title of the task list'),
      updated: z.string().optional().describe('Last modification time in RFC 3339 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    let list = await client.updateTaskList(ctx.input.taskListId, ctx.input.title);

    return {
      output: {
        taskListId: list.id!,
        title: list.title!,
        updated: list.updated
      },
      message: `Updated task list to **"${list.title}"**.`
    };
  })
  .build();
