import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve tasks from one task list or, when taskListId is omitted, from every task list. Supports filtering by completion status, due date range, completion date range, and last modification time. Returns all matching tasks with task-list context and pagination handled automatically.`,
  instructions: [
    'Omit taskListId to list tasks across every task list. Each result identifies its source task list.',
    'Omitting taskListId aggregates tasks across ALL task lists, which can be slow and return large results for accounts with many lists. Provide a taskListId when you only need one list.',
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
      taskListId: z
        .string()
        .optional()
        .describe('ID of one task list to retrieve tasks from; omit to retrieve all lists'),
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
          taskListId: z.string().describe('ID of the task list containing the task'),
          taskListTitle: z
            .string()
            .optional()
            .describe('Title of the task list containing the task'),
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
    try {
      if (ctx.input.taskListId !== undefined && ctx.input.taskListId.trim() === '') {
        throw createApiServiceError(
          'taskListId must be a non-empty task list ID; omit it to list tasks across all task lists',
          { reason: 'google_tasks_invalid_task_list_id' }
        );
      }

      let client = new GoogleTasksClient(ctx.auth.token);
      let params = {
        showCompleted: ctx.input.showCompleted,
        showDeleted: ctx.input.showDeleted,
        showHidden: ctx.input.showHidden,
        dueMin: ctx.input.dueMin,
        dueMax: ctx.input.dueMax,
        completedMin: ctx.input.completedMin,
        completedMax: ctx.input.completedMax,
        updatedMin: ctx.input.updatedMin
      };
      let taskLists =
        ctx.input.taskListId !== undefined
          ? [{ id: ctx.input.taskListId, title: undefined }]
          : await client.getAllTaskLists();
      let output: Array<{
        taskId: string;
        taskListId: string;
        taskListTitle?: string;
        title?: string;
        notes?: string;
        status?: string;
        due?: string;
        completed?: string;
        parentTaskId?: string;
        position?: string;
        updated?: string;
        deleted?: boolean;
        hidden?: boolean;
        webViewLink?: string;
      }> = [];
      let taskListsScanned = 0;

      for (let taskList of taskLists) {
        if (taskList.id === undefined) {
          continue;
        }

        taskListsScanned += 1;
        let tasks = await client.getAllTasks(taskList.id, params);
        output.push(
          ...tasks.map(task => ({
            taskId: task.id!,
            taskListId: taskList.id!,
            taskListTitle: taskList.title,
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
          }))
        );
      }

      return {
        output: { tasks: output },
        message:
          ctx.input.taskListId !== undefined
            ? `Found **${output.length}** task(s) in the list.`
            : `Found **${output.length}** task(s) across **${taskListsScanned}** task list(s).`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Tasks',
        operation: 'list tasks',
        reason: 'google_tasks_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
