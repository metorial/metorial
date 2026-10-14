import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in CentralStationCRM. Modify the subject, due date, completion status, or assigned user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      subject: z.string().optional().describe('Updated subject/title'),
      description: z
        .string()
        .optional()
        .describe('Separate descriptions are unsupported by the task API; omit this field'),
      dueAt: z.string().optional().describe('Updated due date (YYYY-MM-DD or ISO 8601)'),
      done: z
        .boolean()
        .optional()
        .describe('Mark the task as completed (true) or not (false)'),
      responsibleUserId: z
        .number()
        .optional()
        .describe('ID of the new assigned user. Call list_users to discover user IDs')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the updated task'),
      subject: z.string().optional().describe('Task subject'),
      done: z.boolean().optional().describe('Completion status'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    if (ctx.input.description !== undefined) {
      throw createApiServiceError(
        'Tasks do not support a separate description. Use subject for the task text.'
      );
    }
    let data: Record<string, unknown> = {};
    if (ctx.input.subject !== undefined) data.name = ctx.input.subject;
    if (ctx.input.dueAt !== undefined) {
      let dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(ctx.input.dueAt);
      data.precise_time = dateOnly ? `${ctx.input.dueAt}T00:00:00Z` : ctx.input.dueAt;
      data.fuzzy = dateOnly;
    }
    if (ctx.input.done !== undefined) data.finished = ctx.input.done;
    if (ctx.input.responsibleUserId !== undefined) data.user_id = ctx.input.responsibleUserId;

    let result = await client.updateTask(ctx.input.taskId, data);
    let task = result?.task ?? result;

    return {
      output: {
        taskId: task.id,
        subject: task.name ?? task.subject,
        done: task.finished ?? task.done,
        updatedAt: task.updated_at
      },
      message: `Updated task **${task.name ?? task.subject}** (ID: ${task.id})${ctx.input.done !== undefined ? ` — marked as ${ctx.input.done ? 'done' : 'not done'}` : ''}.`
    };
  })
  .build();
