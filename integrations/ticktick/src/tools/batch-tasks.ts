import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checklistItemSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let batchCreateSchema = z.object({
  title: z.string().describe('Task title'),
  content: z.string().optional().describe('Task description/content'),
  projectId: projectIdSchema.optional(),
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
  projectId: projectIdSchema,
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
  projectId: projectIdSchema
});

export let batchTasks = SlateTool.create(spec, {
  name: 'Batch Tasks',
  key: 'batch_tasks',
  description: `Create and update tasks in bulk, and delete tasks through individual requests. Operations are applied as they succeed; a later failure can leave earlier changes in place.`,
  constraints: [
    'At most 50 create entries and 50 update entries per invocation. Deletions run after successful creates and updates.'
  ],
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
      deletedCount: z.number().describe('Number of tasks deleted'),
      successfulTaskIds: z
        .array(z.string())
        .optional()
        .describe('Created and updated task IDs confirmed by TickTick')
    })
  )
  .handleInvocation(async ctx => {
    let createCount = ctx.input.create?.length ?? 0;
    let updateCount = ctx.input.update?.length ?? 0;
    let removeCount = ctx.input.remove?.length ?? 0;
    if (createCount + updateCount + removeCount === 0) {
      throw createApiServiceError('Provide at least one task to create, update, or remove.');
    }
    if (createCount > 50 || updateCount > 50) {
      throw createApiServiceError(
        'TickTick accepts at most 50 create entries and 50 update entries per request. Split the batch into smaller requests.'
      );
    }
    let updateIds = new Set(ctx.input.update?.map(task => task.taskId));
    if (updateIds.size !== updateCount) {
      throw createApiServiceError('Include each task ID only once in the update list.');
    }
    for (let task of [...(ctx.input.create ?? []), ...(ctx.input.update ?? [])]) {
      if (task.priority !== undefined && ![0, 1, 3, 5].includes(task.priority)) {
        throw createApiServiceError(
          'Task priority must be 0 (none), 1 (low), 3 (medium), or 5 (high).'
        );
      }
    }
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
      title: t.title,
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

    let result = await client.batchTasks({
      add: addTasks,
      update: updateTasks
    });

    let failures = Object.entries(result.id2error);
    let successfulTaskIds = Object.keys(result.id2etag);
    if (failures.length > 0) {
      throw createApiServiceError(
        `TickTick reported batch errors: ${failures.map(([id, error]) => `${id}: ${error}`).join('; ')}. Confirmed successful task IDs: ${successfulTaskIds.join(', ') || 'none'}. No requested deletions were attempted.`,
        { reason: 'batch_task_errors' }
      );
    }
    let updatedCount = successfulTaskIds.filter(id => updateIds.has(id)).length;
    let createdCount = successfulTaskIds.length - updatedCount;
    let deletedCount = removeCount;
    if (createdCount !== createCount || updatedCount !== updateCount) {
      throw createApiServiceError(
        `TickTick returned incomplete batch results. Confirmed successful task IDs: ${successfulTaskIds.join(', ') || 'none'}. Check the project before retrying.`,
        { reason: 'incomplete_batch_result' }
      );
    }

    let removals = ctx.input.remove ?? [];
    let successfulDeletions: typeof removals = [];
    for (let [index, task] of removals.entries()) {
      try {
        await client.deleteTask(task.projectId, task.taskId);
        successfulDeletions.push(task);
      } catch (error) {
        let failure = buildApiServiceError(error, {
          providerLabel: 'TickTick',
          operation: 'delete task',
          reason: 'ticktick_api_error'
        });
        let unattemptedDeletions = removals.slice(index + 1);
        let describeRemoval = (removal: (typeof removals)[number]) =>
          `${removal.taskId} (project ${removal.projectId})`;
        let retryHint =
          'Do not repeat creates, updates, or confirmed deletions. Check whether the failed task still exists before retrying its deletion, then retry only failed and unattempted removals.';
        let message = `TickTick batch deletion failed for ${describeRemoval(task)}: ${failure.data.message}. Confirmed created/updated task IDs: ${successfulTaskIds.join(', ') || 'none'}. Confirmed deleted tasks: ${successfulDeletions.map(describeRemoval).join(', ') || 'none'}. Unattempted deletions: ${unattemptedDeletions.map(describeRemoval).join(', ') || 'none'}. ${retryHint}`;
        failure.data.batchProgress = {
          createdTaskIds: successfulTaskIds.filter(id => !updateIds.has(id)),
          updatedTaskIds: successfulTaskIds.filter(id => updateIds.has(id)),
          successfulTaskIds,
          successfulDeletions,
          failedDeletion: task,
          unattemptedDeletions
        };
        failure.data.message = message;
        failure.data.hint = [failure.data.hint, retryHint].filter(Boolean).join(' ');
        failure.message = message;
        throw failure;
      }
    }
    return {
      output: {
        createdCount,
        updatedCount,
        deletedCount,
        successfulTaskIds
      },
      message: `Batch operation completed: **${createdCount}** created, **${updatedCount}** updated, **${deletedCount}** deleted.`
    };
  })
  .build();
