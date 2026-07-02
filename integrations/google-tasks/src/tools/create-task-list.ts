import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let createTaskList = SlateTool.create(spec, {
  name: 'Create Task List',
  key: 'create_task_list',
  description: `Create a new task list with the specified title. Returns the newly created list with its assigned ID.`,
  constraints: [
    'A user can have up to 2,000 task lists.',
    'Task list title can be up to 1,024 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleTasksActionScopes.createTaskList)
  .input(
    z.object({
      title: z.string().describe('Title for the new task list (max 1024 characters)')
    })
  )
  .output(
    z.object({
      taskListId: z.string().describe('Unique identifier for the created task list'),
      title: z.string().describe('Title of the created task list'),
      updated: z.string().optional().describe('Creation time in RFC 3339 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    let list = await client.createTaskList(ctx.input.title);

    return {
      output: {
        taskListId: list.id!,
        title: list.title!,
        updated: list.updated
      },
      message: `Created task list **"${list.title}"**.`
    };
  })
  .build();
