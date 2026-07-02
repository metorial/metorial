import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Salesflare. Modify description, reminder date, assignees, account, or mark as completed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      description: z.string().optional().describe('Updated task description'),
      accountId: z.number().optional().describe('Updated account ID'),
      reminderDate: z.string().optional().describe('Updated reminder date (ISO 8601)'),
      assigneeIds: z.array(z.number()).optional().describe('Updated assignee user IDs'),
      completed: z.boolean().optional().describe('Mark task as completed or incomplete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.accountId !== undefined) data.account = ctx.input.accountId;
    if (ctx.input.reminderDate !== undefined) data.reminder_date = ctx.input.reminderDate;
    if (ctx.input.assigneeIds !== undefined) data.assignees = ctx.input.assigneeIds;
    if (ctx.input.completed !== undefined) data.completed = ctx.input.completed;

    await client.updateTask(ctx.input.taskId, data);

    return {
      output: { success: true },
      message: `Updated task **${ctx.input.taskId}**${ctx.input.completed ? ' (marked as completed)' : ''}.`
    };
  })
  .build();
