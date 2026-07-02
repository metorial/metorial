import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve tasks from a task list with optional filtering. Supports filtering by completion status, due date range, completion date range, and last modification time. Returns all matching tasks with pagination handled automatically.`,
  instructions: [
    'Due dates and timestamps should be in RFC 3339 format (e.g., "2024-01-15T00:00:00Z").',
    'By default, completed tasks are included and deleted/hidden tasks are excluded.'
  ],
  constraints: ['Maximum of 20,000 non-hidden tasks per list.'],
  tags: {
    readOnly: true
  }
})
  .scopes(googleTasksActionScopes.listTasks)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list to retrieve tasks from'),
      showCompleted: z
        .boolean()
        .optional()
        .describe('Include completed tasks (default: true)'),
      showDeleted: z.boolean().optional().describe('Include deleted tasks (default: false)'),
      showHidden: z.boolean().optional().describe('Include hidden tasks (default: false)'),
      dueMin: z.string().optional().describe('Lower bound for due date (RFC 3339 format)'),
      dueMax: z.string().optional().describe('Upper bound for due date (RFC 3339 format)'),
      completedMin: z
        .string()
        .optional()
        .describe('Lower bound for completion date (RFC 3339 format)'),
      completedMax: z
        .string()
        .optional()
        .describe('Upper bound for completion date (RFC 3339 format)'),
      updatedMin: z
        .string()
        .optional()
        .describe('Only return tasks modified after this time (RFC 3339 format)')
    })
  )
  .output(
    z.object({
      tasks: z.array(
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);

    let tasks = await client.getAllTasks(ctx.input.taskListId, {
      showCompleted: ctx.input.showCompleted,
      showDeleted: ctx.input.showDeleted,
      showHidden: ctx.input.showHidden,
      dueMin: ctx.input.dueMin,
      dueMax: ctx.input.dueMax,
      completedMin: ctx.input.completedMin,
      completedMax: ctx.input.completedMax,
      updatedMin: ctx.input.updatedMin
    });

    let output = tasks.map(task => ({
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
    }));

    return {
      output: { tasks: output },
      message: `Found **${output.length}** task(s) in the list.`
    };
  })
  .build();
