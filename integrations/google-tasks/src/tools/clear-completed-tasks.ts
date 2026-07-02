import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let clearCompletedTasks = SlateTool.create(spec, {
  name: 'Clear Completed Tasks',
  key: 'clear_completed_tasks',
  description: `Remove all completed tasks from a task list in a single operation. Cleared tasks become hidden and will no longer appear in default task listings.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleTasksActionScopes.clearCompletedTasks)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list to clear completed tasks from')
    })
  )
  .output(
    z.object({
      cleared: z.boolean().describe('Whether the completed tasks were successfully cleared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    await client.clearCompletedTasks(ctx.input.taskListId);

    return {
      output: { cleared: true },
      message: `Cleared all completed tasks from the list.`
    };
  })
  .build();
