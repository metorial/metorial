import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checklistItemSchema } from '../lib/schemas';
import { spec } from '../spec';

let batchCreateSchema = z.object({
  title: z.string().describe('Task title'),
  content: z.string().optional().describe('Task description/content'),
  projectId: z.string().optional().describe('Project ID. Omit for inbox'),
  isAllDay: z.boolean().optional(),
  startDate: z.string().optional().describe('Start date in ISO 8601'),
  dueDate: z.string().optional().describe('Due date in ISO 8601'),
  timeZone: z.string().optional(),
  priority: z
    .number()
    .optional()
    .describe('Priority: 0 = none, 1 = low, 3 = medium, 5 = high'),
  reminders: z.array(z.string()).optional(),
  repeatFlag: z.string().optional().describe('RRULE format'),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(checklistItemSchema).optional(),
  sortOrder: z.number().optional()
});

let batchUpdateSchema = z.object({
  taskId: z.string().describe('ID of the task to update'),
  projectId: z.string().describe('Project ID the task belongs to'),
  title: z.string().optional(),
  content: z.string().optional(),
  isAllDay: z.boolean().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  timeZone: z.string().optional(),
  priority: z.number().optional(),
  reminders: z.array(z.string()).optional(),
  repeatFlag: z.string().optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(checklistItemSchema).optional(),
  sortOrder: z.number().optional()
});

let batchDeleteSchema = z.object({
  taskId: z.string().describe('ID of the task to delete'),
  projectId: z.string().describe('Project ID the task belongs to')
});

export let batchTasks = SlateTool.create(spec, {
  name: 'Batch Tasks',
  key: 'batch_tasks',
  description: `Perform bulk task operations in a single API call. Supports creating, updating, and deleting multiple tasks simultaneously. All three operation types can be combined in one request.`,
  constraints: ['Maximum 500 tasks per project.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      create: z.array(batchCreateSchema).optional().describe('Tasks to create'),
      update: z.array(batchUpdateSchema).optional().describe('Tasks to update'),
      remove: z.array(batchDeleteSchema).optional().describe('Tasks to delete')
    })
  )
  .output(
    z.object({
      createdCount: z.number().describe('Number of tasks created'),
      updatedCount: z.number().describe('Number of tasks updated'),
      deletedCount: z.number().describe('Number of tasks deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let addTasks = ctx.input.create?.map(t => ({
      title: t.title,
      content: t.content,
      projectId: t.projectId,
      isAllDay: t.isAllDay,
      startDate: t.startDate,
      dueDate: t.dueDate,
      timeZone: t.timeZone,
      priority: t.priority,
      reminders: t.reminders,
      repeatFlag: t.repeatFlag,
      tags: t.tags,
      items: t.subtasks,
      sortOrder: t.sortOrder
    }));

    let updateTasks = ctx.input.update?.map(t => ({
      taskId: t.taskId,
      projectId: t.projectId,
      title: t.title ?? '',
      content: t.content,
      isAllDay: t.isAllDay,
      startDate: t.startDate,
      dueDate: t.dueDate,
      timeZone: t.timeZone,
      priority: t.priority,
      reminders: t.reminders,
      repeatFlag: t.repeatFlag,
      tags: t.tags,
      items: t.subtasks,
      sortOrder: t.sortOrder
    }));

    let deleteTasks = ctx.input.remove;

    await client.batchTasks({
      add: addTasks,
      update: updateTasks,
      delete: deleteTasks
    });

    let createdCount = ctx.input.create?.length ?? 0;
    let updatedCount = ctx.input.update?.length ?? 0;
    let deletedCount = ctx.input.remove?.length ?? 0;

    return {
      output: {
        createdCount,
        updatedCount,
        deletedCount
      },
      message: `Batch operation completed: **${createdCount}** created, **${updatedCount}** updated, **${deletedCount}** deleted.`
    };
  })
  .build();
