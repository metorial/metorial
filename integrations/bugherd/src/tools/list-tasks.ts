import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { positiveIntegerSchema } from '../lib/schemas';
import { mapTaskSummary, taskSummarySchema } from '../lib/tasks';
import type { BugherdMeta, BugherdTask } from '../lib/types';
import { spec } from '../spec';

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
      projectId: positiveIntegerSchema.describe('Project ID to list tasks from'),
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
      assignedToId: positiveIntegerSchema.optional().describe('Filter by assignee user ID'),
      externalId: z.string().optional().describe('Filter by external tracking ID'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return tasks updated after this ISO 8601 timestamp'),
      createdSince: z
        .string()
        .optional()
        .describe('Only return tasks created after this ISO 8601 timestamp'),
      page: positiveIntegerSchema
        .optional()
        .describe('Page number for pagination (100 tasks per page)')
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

    let result: { tasks: BugherdTask[]; meta: BugherdMeta };
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

    let tasks = result.tasks.map(mapTaskSummary);

    return {
      output: {
        tasks,
        totalCount: result.meta?.count ?? tasks.length
      },
      message: `Found **${tasks.length}** task(s) in project ${ctx.input.projectId} (${ctx.input.category} view).`
    };
  })
  .build();
