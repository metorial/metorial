import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import type { ApolloTask } from '../lib/types';
import { spec } from '../spec';

let taskTypeSchema = z.enum([
  'call',
  'outreach_manual_email',
  'linkedin_step_connect',
  'linkedin_step_message',
  'linkedin_step_view_profile',
  'linkedin_step_interact_post',
  'action_item'
]);

let taskStatusSchema = z.enum(['scheduled', 'completed', 'skipped']);
let taskPrioritySchema = z.enum(['high', 'medium', 'low']);

let taskOutputSchema = z.object({
  taskId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dueAt: z.string().optional(),
  title: z.string().optional(),
  note: z.string().optional(),
  userId: z.string().optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  completedAt: z.string().optional()
});

type TaskOutput = z.infer<typeof taskOutputSchema>;

let formatTask = (t: ApolloTask): TaskOutput => ({
  taskId: t.id,
  type: t.type,
  status: t.status,
  priority: t.priority,
  dueAt: t.due_at,
  title: t.title,
  note: t.note,
  userId: t.user_id,
  contactId: t.contact_id,
  accountId: t.account_id,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  completedAt: t.completed_at
});

export let searchTasks = SlateTool.create(spec, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description: `Search for tasks created by your team in Apollo. Tasks track upcoming actions like emailing or calling contacts.`,
  constraints: [
    'Maximum 50,000 results (100 per page, up to 500 pages)',
    'Requires a master API key'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z.string().optional().describe('Keywords to search tasks'),
      sortByField: z.string().optional().describe('Field to sort results by'),
      sortAscending: z
        .boolean()
        .optional()
        .describe('Sort in ascending order (default: false)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.searchTasks({
      qKeywords: ctx.input.keywords,
      sortByField: ctx.input.sortByField,
      sortAscending: ctx.input.sortAscending,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let tasks = result.tasks.map(formatTask);

    return {
      output: {
        tasks,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? tasks.length}** tasks. Returned ${tasks.length} results.`
    };
  })
  .build();

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create one or more tasks in Apollo to track upcoming actions like emailing or calling contacts. Use contactId for one task or contactIds to create the same task for multiple contacts.`,
  instructions: [
    'Provide userId, type, status, dueAt, and either contactId or contactIds.',
    'Use contactIds only when every created task should share the same owner, type, due time, note, priority, and status.',
    'Apollo does not deduplicate tasks — duplicate tasks with the same details will be created.'
  ],
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Apollo user ID to assign the task to'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID for single-task creation. Do not combine with contactIds.'),
      contactIds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs for bulk task creation. Do not combine with contactId.'),
      type: taskTypeSchema.describe('Task type'),
      priority: taskPrioritySchema.optional().describe('Task priority (default: medium)'),
      dueAt: z.string().describe('Due date/time in ISO 8601 format'),
      title: z
        .string()
        .optional()
        .describe('Task title for single-task creation. Not supported with contactIds.'),
      note: z.string().optional().describe('Task description/note'),
      status: taskStatusSchema.describe('Task status')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      tasks: z.array(taskOutputSchema),
      taskIds: z.array(z.string()),
      tasksCreated: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let hasContactId = Boolean(ctx.input.contactId);
    let hasContactIds = Boolean(ctx.input.contactIds?.length);

    if (hasContactId === hasContactIds) {
      throw apolloServiceError('Provide either contactId or contactIds, but not both.');
    }
    if (hasContactIds && ctx.input.title) {
      throw apolloServiceError(
        'title is only supported when creating one task with contactId.'
      );
    }

    if (hasContactIds) {
      let result = await client.bulkCreateTasks({
        userId: ctx.input.userId,
        contactIds: ctx.input.contactIds!,
        type: ctx.input.type,
        priority: ctx.input.priority,
        dueAt: ctx.input.dueAt,
        note: ctx.input.note,
        status: ctx.input.status
      });
      let tasks: TaskOutput[] = Array.isArray(result.tasks)
        ? result.tasks.map((task: ApolloTask) => formatTask(task))
        : [];
      let taskIds = tasks.map(task => task.taskId).filter((id): id is string => Boolean(id));

      return {
        output: {
          success: true,
          tasks,
          taskIds,
          tasksCreated: tasks.length
        },
        message: `Bulk created **${tasks.length}** task(s).`
      };
    }

    let result = await client.createTask({
      userId: ctx.input.userId,
      contactId: ctx.input.contactId!,
      type: ctx.input.type,
      priority: ctx.input.priority,
      dueAt: ctx.input.dueAt,
      title: ctx.input.title,
      note: ctx.input.note,
      status: ctx.input.status
    });
    let tasks: TaskOutput[] = result.task ? [formatTask(result.task)] : [];
    let taskIds = tasks.map(task => task.taskId).filter((id): id is string => Boolean(id));

    return {
      output: {
        success: true,
        tasks,
        taskIds,
        tasksCreated: tasks.length
      },
      message: `Created task${ctx.input.type ? ` (${ctx.input.type})` : ''}${ctx.input.note ? `: "${ctx.input.note}"` : ''}.`
    };
  })
  .build();
