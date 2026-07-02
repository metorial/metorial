import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let taskSummarySchema = z.object({
  taskId: z.number().describe('Global task ID'),
  localTaskId: z.number().describe('Project-scoped task ID'),
  projectId: z.number().describe('Project ID the task belongs to'),
  description: z.string().describe('Task description'),
  title: z.string().nullable().describe('Task title'),
  status: z.string().describe('Current task status'),
  priorityId: z
    .number()
    .describe('Priority: 0=not set, 1=critical, 2=important, 3=normal, 4=minor'),
  tagNames: z.array(z.string()).describe('Tags on the task'),
  externalId: z.string().nullable().describe('External tracking ID'),
  assigneeEmail: z.string().nullable().describe('Email of the assignee'),
  requesterEmail: z.string().nullable().describe('Email of the requester'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in a BugHerd project with flexible filtering. Can show all tasks, feedback only, archived, or taskboard view. Supports filtering by status, priority, tag, assignee, external ID, and date ranges.`,
  instructions: [
    'Use the "category" parameter to choose which task view to use: "all" includes everything, "feedback" shows unorganized feedback, "archived" shows archived tasks, "taskboard" shows only the active board.',
    'Priority values: "not set", "critical", "important", "normal", "minor".',
    'Default statuses: "backlog", "todo", "doing", "done", "closed". Projects with custom columns may have additional status values.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID to list tasks from'),
      category: z
        .enum(['all', 'feedback', 'archived', 'taskboard'])
        .default('all')
        .describe('Which task view to use'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., "backlog", "todo", "doing", "done", "closed")'),
      priority: z
        .string()
        .optional()
        .describe('Filter by priority (e.g., "critical", "important", "normal", "minor")'),
      tag: z.string().optional().describe('Filter by tag name'),
      assignedToId: z.number().optional().describe('Filter by assignee user ID'),
      externalId: z.string().optional().describe('Filter by external tracking ID'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return tasks updated after this ISO 8601 timestamp'),
      createdSince: z
        .string()
        .optional()
        .describe('Only return tasks created after this ISO 8601 timestamp'),
      page: z.number().optional().describe('Page number for pagination (100 tasks per page)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSummarySchema).describe('List of tasks'),
      totalCount: z.number().describe('Total number of matching tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let filters = {
      status: ctx.input.status,
      priority: ctx.input.priority,
      tag: ctx.input.tag,
      assignedToId: ctx.input.assignedToId,
      externalId: ctx.input.externalId,
      updatedSince: ctx.input.updatedSince,
      createdSince: ctx.input.createdSince,
      page: ctx.input.page
    };

    let result: any;
    switch (ctx.input.category) {
      case 'feedback':
        result = await client.listFeedbackTasks(ctx.input.projectId, filters);
        break;
      case 'archived':
        result = await client.listArchivedTasks(ctx.input.projectId, filters);
        break;
      case 'taskboard':
        result = await client.listTaskboardTasks(ctx.input.projectId, filters);
        break;
      default:
        result = await client.listTasks(ctx.input.projectId, filters);
    }

    let tasks = result.tasks.map((t: any) => ({
      taskId: t.id,
      localTaskId: t.local_task_id,
      projectId: t.project_id,
      description: t.description,
      title: t.title,
      status: t.status,
      priorityId: t.priority_id,
      tagNames: t.tag_names,
      externalId: t.external_id,
      assigneeEmail: t.assigned_to?.email ?? null,
      requesterEmail: t.requester_email,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        tasks,
        totalCount: result.meta?.count ?? tasks.length
      },
      message: `Found **${tasks.length}** task(s) in project ${ctx.input.projectId} (${ctx.input.category} view).`
    };
  })
  .build();
