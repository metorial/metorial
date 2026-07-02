import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let listTaskLists = SlateTool.create(spec, {
  name: 'List Task Lists',
  key: 'list_task_lists',
  description: `Retrieve all task lists for the authenticated user. Returns the complete set of task lists including their IDs, titles, and last-updated timestamps. Use this to discover available lists before operating on tasks within them.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleTasksActionScopes.listTaskLists)
  .input(z.object({}))
  .output(
    z.object({
      taskLists: z.array(
        z.object({
          taskListId: z.string().describe('Unique identifier for the task list'),
          title: z.string().describe('Title of the task list'),
          updated: z.string().optional().describe('Last modification time in RFC 3339 format')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    let lists = await client.getAllTaskLists();

    let taskLists = lists.map(list => ({
      taskListId: list.id!,
      title: list.title!,
      updated: list.updated
    }));

    return {
      output: { taskLists },
      message: `Found **${taskLists.length}** task list(s).`
    };
  })
  .build();
