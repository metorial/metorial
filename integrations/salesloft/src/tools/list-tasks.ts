import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { taskSchema } from '../lib/api-schemas';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.number().describe('SalesLoft task ID'),
  subject: z.string().nullable().optional().describe('Task subject'),
  taskType: z.string().nullable().optional().describe('Task type'),
  status: z.string().nullable().optional().describe('Task status'),
  currentState: z.string().nullable().optional().describe('Current task state'),
  dueDate: z.string().nullable().optional().describe('Due date'),
  dueAt: z.string().nullable().optional().describe('Due date and time'),
  remindAt: z.string().nullable().optional().describe('Reminder date and time'),
  description: z.string().nullable().optional().describe('Task description'),
  completed: z.boolean().nullable().optional().describe('Whether the task is completed'),
  completedAt: z.string().nullable().optional().describe('Completion timestamp'),
  personId: z.number().nullable().optional().describe('Associated person ID'),
  userId: z.number().nullable().optional().describe('Assigned user ID'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let mapTask = (raw: z.output<typeof taskSchema>) => ({
  taskId: raw.id,
  subject: raw.subject,
  taskType: raw.task_type,
  status: undefined,
  currentState: raw.current_state,
  dueDate: raw.due_date,
  dueAt: raw.due_at,
  remindAt: raw.remind_at,
  description: raw.description,
  completed: raw.current_state == null ? undefined : raw.current_state === 'completed',
  completedAt: raw.completed_at,
  personId: raw.person?.id ?? null,
  userId: raw.user?.id ?? null,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in SalesLoft. Filter by person, account, task type, state, due interval, or current user assignment. Tasks created by cadence steps are not returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      personId: z.number().optional().describe('Filter by associated person ID'),
      accountId: z.number().optional().describe('Filter by associated account ID'),
      currentUser: z
        .boolean()
        .optional()
        .describe('Filter to tasks assigned to the current user'),
      taskType: z.string().optional().describe('Filter by task type: call, email or general'),
      currentState: z
        .enum(['scheduled', 'completed'])
        .optional()
        .describe('Filter open (scheduled) or completed tasks'),
      timeInterval: z
        .enum(['overdue', 'today', 'tomorrow', 'this_week', 'next_week'])
        .optional()
        .describe('Filter tasks by due-date interval')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema).describe('List of tasks'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTasks(ctx.input);
    let tasks = result.data.map(mapTask);

    return {
      output: {
        tasks,
        paging: result.metadata.paging
      },
      message: `Found **${tasks.length}** tasks (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Fetch a single task from SalesLoft by ID. Returns task details including subject, type, status, due date, and assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to fetch')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.taskId);
    let output = mapTask(task);

    return {
      output,
      message: `Fetched task **${output.subject || 'Untitled'}** (ID: ${output.taskId}).`
    };
  })
  .build();

let taskTypeSchema = z.enum(['call', 'email', 'general']);

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a call, email or general to-do task for a person in Salesloft, assigned to the authenticated user unless another user is given.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Task subject line'),
      personId: z.number().describe('ID of the person the task is about'),
      taskType: taskTypeSchema.describe('Task type'),
      dueDate: z.string().describe('Due date in ISO-8601 date format (YYYY-MM-DD)'),
      userId: z
        .number()
        .optional()
        .describe('ID of the user assigned the task (defaults to the authenticated user)'),
      remindAt: z.string().optional().describe('ISO-8601 datetime for the reminder'),
      description: z.string().optional().describe('Task description'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key that prevents duplicate tasks when a request is retried')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      subject: ctx.input.subject,
      person_id: ctx.input.personId,
      task_type: ctx.input.taskType,
      due_date: ctx.input.dueDate
    };
    if (ctx.input.userId !== undefined) body.user_id = ctx.input.userId;
    if (ctx.input.remindAt !== undefined) body.remind_at = ctx.input.remindAt;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.idempotencyKey !== undefined)
      body.idempotency_key = ctx.input.idempotencyKey;

    let task = await client.createTask(body);
    let output = mapTask(task);

    return {
      output,
      message: `Created ${output.taskType ?? ctx.input.taskType} task **${output.subject ?? ctx.input.subject}** (ID: ${output.taskId}).`
    };
  })
  .build();

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update a Salesloft task's subject, type, due date, reminder, assignee or description, or mark it completed. Completing a task cannot be undone through the API.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      subject: z.string().optional().describe('Updated subject line'),
      taskType: taskTypeSchema.optional().describe('Updated task type'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      dueAt: z.string().optional().describe('Updated ISO-8601 due datetime'),
      remindAt: z.string().optional().describe('Updated ISO-8601 reminder datetime'),
      description: z.string().optional().describe('Updated description'),
      userId: z.number().optional().describe('ID of the user to reassign the task to'),
      currentState: z
        .enum(['completed'])
        .optional()
        .describe('Set to completed to mark the task done')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = {};
    if (ctx.input.subject !== undefined) body.subject = ctx.input.subject;
    if (ctx.input.taskType !== undefined) body.task_type = ctx.input.taskType;
    if (ctx.input.dueDate !== undefined) body.due_date = ctx.input.dueDate;
    if (ctx.input.dueAt !== undefined) body.due_at = ctx.input.dueAt;
    if (ctx.input.remindAt !== undefined) body.remind_at = ctx.input.remindAt;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.userId !== undefined) body.user_id = ctx.input.userId;
    if (ctx.input.currentState !== undefined) body.current_state = ctx.input.currentState;
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one task field to update.');

    let task = await client.updateTask(ctx.input.taskId, body);
    let output = mapTask(task);

    return {
      output,
      message: `Updated task **${output.subject || 'Untitled'}** (ID: ${output.taskId}${output.currentState ? `, state: ${output.currentState}` : ''}).`
    };
  })
  .build();

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Delete a Salesloft task. Restoration requires contacting Salesloft support.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the deleted task'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { taskId: ctx.input.taskId, deleted: true },
      message: `Deleted task ${ctx.input.taskId}.`
    };
  })
  .build();
