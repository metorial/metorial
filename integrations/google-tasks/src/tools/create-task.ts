import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a specified task list. Supports setting a title, notes, due date, and completion status. Optionally position the task under a parent (as a subtask) or after a specific sibling task.`,
  instructions: [
    'Due dates should be in RFC 3339 format. Only the date portion is used; the time is discarded by Google Tasks.',
    'To create a subtask, provide the parentTaskId of the parent task.',
    'To position a task after a specific sibling, provide previousTaskId.'
  ],
  constraints: [
    'A user can have up to 20,000 non-hidden tasks per list and 100,000 tasks total.',
    'A task can have up to 2,000 subtasks.',
    'Tasks assigned from Docs or Chat Spaces cannot be created via the API.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleTasksActionScopes.createTask)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list to create the task in'),
      title: z.string().describe('Title for the new task (max 1024 characters)'),
      notes: z
        .string()
        .optional()
        .describe('Description/notes for the task (max 8192 characters)'),
      due: z
        .string()
        .optional()
        .describe('Due date in RFC 3339 format (time portion is discarded)'),
      status: z
        .enum(['needsAction', 'completed'])
        .optional()
        .describe('Task status (default: "needsAction")'),
      parentTaskId: z
        .string()
        .optional()
        .describe('Parent task ID to create this as a subtask'),
      previousTaskId: z
        .string()
        .optional()
        .describe('Sibling task ID to place this task after')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the created task'),
      title: z.string().optional().describe('Title of the created task'),
      notes: z.string().optional().describe('Description/notes of the task'),
      status: z.string().optional().describe('Status of the created task'),
      due: z.string().optional().describe('Due date of the created task'),
      parentTaskId: z.string().optional().describe('Parent task ID if this is a subtask'),
      position: z.string().optional().describe('Position among sibling tasks'),
      updated: z.string().optional().describe('Creation time in RFC 3339 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);

    let task = await client.createTask(
      ctx.input.taskListId,
      {
        title: ctx.input.title,
        notes: ctx.input.notes,
        due: ctx.input.due,
        status: ctx.input.status
      },
      {
        parent: ctx.input.parentTaskId,
        previous: ctx.input.previousTaskId
      }
    );

    return {
      output: {
        taskId: task.id!,
        title: task.title,
        notes: task.notes,
        status: task.status,
        due: task.due,
        parentTaskId: task.parent,
        position: task.position,
        updated: task.updated
      },
      message: `Created task **"${task.title}"** in the list.`
    };
  })
  .build();
