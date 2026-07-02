import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in CentralStationCRM. Modify the subject, description, due date, completion status, or assigned user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      subject: z.string().optional().describe('Updated subject/title'),
      description: z.string().optional().describe('Updated description'),
      dueAt: z.string().optional().describe('Updated due date (YYYY-MM-DD or ISO 8601)'),
      done: z
        .boolean()
        .optional()
        .describe('Mark the task as completed (true) or not (false)'),
      responsibleUserId: z.number().optional().describe('ID of the new assigned user')
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

    let data: Record<string, unknown> = {};
    if (ctx.input.subject !== undefined) data.subject = ctx.input.subject;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.done !== undefined) data.done = ctx.input.done;
    if (ctx.input.responsibleUserId !== undefined) data.user_id = ctx.input.responsibleUserId;

    let result = await client.updateTask(ctx.input.taskId, data);
    let task = result?.task ?? result;

    return {
      output: {
        taskId: task.id,
        subject: task.subject,
        done: task.done,
        updatedAt: task.updated_at
      },
      message: `Updated task **${task.subject}** (ID: ${task.id})${ctx.input.done !== undefined ? ` — marked as ${ctx.input.done ? 'done' : 'not done'}` : ''}.`
    };
  })
  .build();
