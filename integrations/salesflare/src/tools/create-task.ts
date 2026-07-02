import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Salesflare. A description is required. Optionally assign to users, link to an account, and set a reminder date.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      description: z.string().describe('Task description (required)'),
      accountId: z.number().optional().describe('Account ID to link the task to'),
      reminderDate: z
        .string()
        .optional()
        .describe('Reminder date (ISO 8601). Defaults to current time.'),
      assigneeIds: z.array(z.number()).optional().describe('User IDs to assign the task to')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task'),
      task: z.record(z.string(), z.any()).describe('Created task data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {
      description: ctx.input.description
    };
    if (ctx.input.accountId) data.account = ctx.input.accountId;
    if (ctx.input.reminderDate) data.reminder_date = ctx.input.reminderDate;
    if (ctx.input.assigneeIds) data.assignees = ctx.input.assigneeIds;

    let result = await client.createTask(data);
    let taskId = result.id ?? 0;

    return {
      output: {
        taskId,
        task: result
      },
      message: `Created task **"${ctx.input.description}"** (ID: ${taskId}).`
    };
  })
  .build();
