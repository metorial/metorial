import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.string().describe('Unique ID of the task'),
  content: z.string().describe('Task title/content'),
  description: z.string().optional().describe('Task description'),
  status: z.string().optional().describe('Task status (new, completed, etc.)'),
  priority: z.string().optional().describe('Task priority'),
  startDate: z.string().optional().describe('Task start date'),
  dueDate: z.string().optional().describe('Task due date'),
  completed: z.boolean().optional().describe('Whether the task is completed'),
  projectId: z.string().optional().describe('Project this task belongs to'),
  taskListId: z.string().optional().describe('Task list this task belongs to'),
  assigneeIds: z.array(z.string()).optional().describe('IDs of assigned people'),
  estimatedMinutes: z.number().optional().describe('Estimated time in minutes'),
  createdOn: z.string().optional().describe('Date the task was created')
});

let parseTask = (t: any) => ({
  taskId: String(t.id),
  content: t.content || t.content || '',
  description: t.description || undefined,
  status: t.status || undefined,
  priority: t.priority || undefined,
  startDate: t['start-date'] || t.startDate || undefined,
  dueDate: t['due-date'] || t.dueDate || undefined,
  completed: t.completed ?? undefined,
  projectId: t['project-id']
    ? String(t['project-id'])
    : t.projectId
      ? String(t.projectId)
      : undefined,
  taskListId: t['todo-list-id']
    ? String(t['todo-list-id'])
    : t.taskListId
      ? String(t.taskListId)
      : undefined,
  assigneeIds: t['responsible-party-ids']
    ? String(t['responsible-party-ids']).split(',')
    : undefined,
  estimatedMinutes: t['estimated-minutes']
    ? Number(t['estimated-minutes'])
    : t.estimatedMinutes
      ? Number(t.estimatedMinutes)
      : undefined,
  createdOn: t['created-on'] || t.createdOn || undefined
});

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, complete, reopen, or delete a Teamwork task. Supports setting assignees, due dates, priorities, estimated time, and tags.`,
  instructions: [
    'For "create", provide taskListId and content (title) at minimum.',
    'For "update", "complete", "reopen", and "delete", provide the taskId.',
    'Priority values: "low", "medium", "high".'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'complete', 'reopen', 'delete'])
        .describe('The action to perform'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID (required for update/complete/reopen/delete)'),
      taskListId: z.string().optional().describe('Task list ID (required for create)'),
      content: z.string().optional().describe('Task title/name'),
      description: z.string().optional().describe('Task description (HTML supported)'),
      assigneeId: z.string().optional().describe('Person ID to assign'),
      startDate: z.string().optional().describe('Start date (YYYYMMDD)'),
      dueDate: z.string().optional().describe('Due date (YYYYMMDD)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority'),
      estimatedMinutes: z.number().optional().describe('Estimated time in minutes'),
      tags: z.string().optional().describe('Comma-separated tags'),
      parentTaskId: z.string().optional().describe('Parent task ID for creating subtasks')
    })
  )
  .output(
    z.object({
      task: taskOutputSchema.optional().describe('The created or updated task'),
      completed: z.boolean().optional().describe('Whether the task was completed'),
      reopened: z.boolean().optional().describe('Whether the task was reopened'),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.taskListId) throw new Error('taskListId is required to create a task');
      if (!ctx.input.content) throw new Error('content is required to create a task');
      let result = await client.createTask(ctx.input.taskListId, {
        content: ctx.input.content,
        description: ctx.input.description,
        'responsible-party-id': ctx.input.assigneeId,
        'start-date': ctx.input.startDate,
        'due-date': ctx.input.dueDate,
        priority: ctx.input.priority,
        'estimated-minutes': ctx.input.estimatedMinutes,
        tags: ctx.input.tags,
        parentTaskId: ctx.input.parentTaskId
      });
      let taskId = result.id || result.taskId;
      if (taskId) {
        let full = await client.getTask(String(taskId));
        let t = full['todo-item'] || full.task || full;
        return {
          output: { task: parseTask(t) },
          message: `Created task **${ctx.input.content}**.`
        };
      }
      return {
        output: { task: undefined },
        message: `Created task **${ctx.input.content}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.taskId) throw new Error('taskId is required to update a task');
      await client.updateTask(ctx.input.taskId, {
        content: ctx.input.content,
        description: ctx.input.description,
        'responsible-party-id': ctx.input.assigneeId,
        'start-date': ctx.input.startDate,
        'due-date': ctx.input.dueDate,
        priority: ctx.input.priority,
        'estimated-minutes': ctx.input.estimatedMinutes,
        tags: ctx.input.tags,
        parentTaskId: ctx.input.parentTaskId
      });
      let full = await client.getTask(ctx.input.taskId);
      let t = full['todo-item'] || full.task || full;
      return {
        output: { task: parseTask(t) },
        message: `Updated task **${t.content || ctx.input.taskId}**.`
      };
    }

    if (action === 'complete') {
      if (!ctx.input.taskId) throw new Error('taskId is required to complete a task');
      await client.completeTask(ctx.input.taskId);
      return {
        output: { completed: true },
        message: `Completed task **${ctx.input.taskId}**.`
      };
    }

    if (action === 'reopen') {
      if (!ctx.input.taskId) throw new Error('taskId is required to reopen a task');
      await client.reopenTask(ctx.input.taskId);
      return {
        output: { reopened: true },
        message: `Reopened task **${ctx.input.taskId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.taskId) throw new Error('taskId is required to delete a task');
      await client.deleteTask(ctx.input.taskId);
      return {
        output: { deleted: true },
        message: `Deleted task **${ctx.input.taskId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
