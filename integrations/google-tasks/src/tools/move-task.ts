import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let moveTask = SlateTool.create(spec, {
  name: 'Move Task',
  key: 'move_task',
  description: `Move a task to a different position, parent, or task list. Can reorder a task among its siblings, nest it under a parent task as a subtask, or transfer it to an entirely different task list.`,
  instructions: [
    'To move a task to the top level, omit parentTaskId.',
    'To move a task to the first position among siblings, omit previousTaskId.',
    'To move a task to a different list, provide destinationTaskListId.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleTasksActionScopes.moveTask)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the current task list containing the task'),
      taskId: z.string().describe('ID of the task to move'),
      parentTaskId: z
        .string()
        .optional()
        .describe('New parent task ID (omit to move to top level)'),
      previousTaskId: z
        .string()
        .optional()
        .describe('Sibling task ID to place this task after (omit for first position)'),
      destinationTaskListId: z
        .string()
        .optional()
        .describe('Destination task list ID to move the task to a different list')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the moved task'),
      title: z.string().optional().describe('Title of the moved task'),
      parentTaskId: z.string().optional().describe('New parent task ID'),
      position: z.string().optional().describe('New position among sibling tasks'),
      updated: z.string().optional().describe('Last modification time in RFC 3339 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);

    let task = await client.moveTask(ctx.input.taskListId, ctx.input.taskId, {
      parent: ctx.input.parentTaskId,
      previous: ctx.input.previousTaskId,
      destinationTasklist: ctx.input.destinationTaskListId
    });

    return {
      output: {
        taskId: task.id!,
        title: task.title,
        parentTaskId: task.parent,
        position: task.position,
        updated: task.updated
      },
      message: `Moved task **"${task.title ?? task.id}"**.`
    };
  })
  .build();
