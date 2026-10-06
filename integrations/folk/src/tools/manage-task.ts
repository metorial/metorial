import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { assignedUserReferences, Client, type TaskInput } from '../lib/client';
import { taskSchema } from '../lib/schemas';
import { spec } from '../spec';
export const manageTask = SlateTool.create(spec, {
  key: 'manage_task',
  name: 'Manage Task',
  description:
    'Gets, creates, updates, deletes, completes, or reopens a Folk task. Completion is explicit; updating due dates never marks a task done. Deletion is permanent.',
  instructions: [
    'Create requires entityId, title, and dueAt. Other actions require taskId from list_tasks. Updating assignment replaces the list; omit it to preserve existing owners. isPublic defaults to true on creation; use false for private tasks. Assigned users default to the API key owner on creation.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete', 'mark_done', 'mark_to_do']),
      taskId: z
        .string()
        .optional()
        .describe('Required except for create. Call list_tasks to discover task IDs.'),
      entityId: z
        .string()
        .optional()
        .describe(
          'Required for create; update can move the task to a different person, company, or deal.'
        ),
      title: z.string().optional().describe('Required for create; optional for update.'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Markdown description; null clears it during update only.'),
      dueAt: z
        .string()
        .optional()
        .describe('Required for create; optional for update, YYYY-MM-DD.'),
      dueTime: z
        .string()
        .nullable()
        .optional()
        .describe('Create/update time as HH:mm; null clears the time.'),
      recurrenceFrequency: z
        .enum(['weekday', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
        .nullable()
        .optional()
        .describe('Create/update recurrence; null makes the task non-recurring.'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Create/update visibility: false is visible only to assigned users.'),
      assignedUsers: z
        .array(z.object({ userId: z.string().optional(), userEmail: z.string().optional() }))
        .optional()
        .describe('Create/update assignees; exactly one userId or userEmail per entry.'),
      completedAt: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Required ISO 8601 timestamp for mark_done. Create optionally accepts a timestamp or null; update cannot change completion.'
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Optional retry key for create/update/completion actions. Reuse only with identical input within 24 hours.'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      task: taskSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action, taskId, entityId, assignedUsers, idempotencyKey, ...fields } = ctx.input;
    const client = new Client({ token: ctx.auth.token });
    const body: TaskInput = pickDefined({
      ...fields,
      entity: entityId === undefined ? undefined : { id: entityId },
      assignedUsers:
        assignedUsers === undefined ? undefined : assignedUserReferences(assignedUsers)
    });
    if (action !== 'create' && !taskId)
      throw createApiServiceError(
        'Provide taskId for this action; use list_tasks to discover it.'
      );
    if (action === 'create' && taskId !== undefined)
      throw createApiServiceError('Do not supply taskId when creating a task.');
    const writeFields = Object.keys(body);
    if (['get', 'delete', 'mark_to_do'].includes(action) && writeFields.length)
      throw createApiServiceError(
        'This action does not accept task content or completion fields.'
      );
    if (['get', 'delete'].includes(action) && idempotencyKey !== undefined)
      throw createApiServiceError('This action does not accept idempotencyKey.');
    if (
      action === 'mark_done' &&
      (writeFields.some(field => field !== 'completedAt') ||
        typeof fields.completedAt !== 'string')
    )
      throw createApiServiceError(
        'mark_done requires only taskId and a completedAt timestamp.'
      );
    if (action === 'delete') {
      const removed = await client.deleteTask(taskId ?? '');
      return {
        output: { taskId: removed.id, deleted: true },
        message: 'Task deleted permanently.'
      };
    }
    const task =
      action === 'create'
        ? await client.createTask(body, idempotencyKey)
        : action === 'update'
          ? await client.updateTask(taskId ?? '', body, idempotencyKey)
          : action === 'mark_done'
            ? await client.markTaskDone(taskId ?? '', fields.completedAt ?? '', idempotencyKey)
            : action === 'mark_to_do'
              ? await client.markTaskToDo(taskId ?? '', idempotencyKey)
              : await client.getTask(taskId ?? '');
    return { output: { taskId: task.id, task }, message: `Task ${action} completed.` };
  })
  .build();
