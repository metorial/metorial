import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a single task by its ID from a specified task list. Returns the full task details including title, notes, status, due date, and hierarchy information.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleTasksActionScopes.getTask)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list containing the task'),
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the task'),
      title: z.string().optional().describe('Title of the task'),
      notes: z.string().optional().describe('Description/notes of the task'),
      status: z.string().optional().describe('"needsAction" or "completed"'),
      due: z.string().optional().describe('Due date in RFC 3339 format'),
      completed: z.string().optional().describe('Completion date in RFC 3339 format'),
      parentTaskId: z.string().optional().describe('Parent task ID if this is a subtask'),
      position: z.string().optional().describe('Position among sibling tasks'),
      updated: z.string().optional().describe('Last modification time in RFC 3339 format'),
      deleted: z.boolean().optional().describe('Whether the task is deleted'),
      hidden: z.boolean().optional().describe('Whether the task is hidden'),
      webViewLink: z.string().optional().describe('Link to view the task in Google Tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);
    let task = await client.getTask(ctx.input.taskListId, ctx.input.taskId);

    return {
      output: {
        taskId: task.id!,
        title: task.title,
        notes: task.notes,
        status: task.status,
        due: task.due,
        completed: task.completed,
        parentTaskId: task.parent,
        position: task.position,
        updated: task.updated,
        deleted: task.deleted,
        hidden: task.hidden,
        webViewLink: task.webViewLink
      },
      message: `Retrieved task **"${task.title ?? task.id}"**.`
    };
  })
  .build();
